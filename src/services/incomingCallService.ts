/**
 * 来电检测服务（呼入）
 *
 * 实现 APP 端后台来电监听：
 * - Android: 使用 TelephonyManager + PhoneStateListener 监听通话状态
 * - iOS: 使用 CXCallObserver 监听来电（uni-app 环境下通过轮询 fallback）
 *
 * 检测到来电后：
 * 1. 通过 WebSocket 发送 INCOMING_CALL_DETECTED 给后端
 * 2. 后端匹配客户、创建通话记录、推送 CALL_INCOMING 给 CRM 前端
 * 3. 后端回传 INCOMING_CALL_CONFIRMED（含 callId）给 APP
 * 4. APP 使用 callId 跟踪后续通话状态（接听/挂断/录音上传）
 */

import { wsService } from './websocket'
import { callStateService } from './callStateService'
import { reportIncomingCall } from '@/api/call'

// 来电状态
type IncomingState = 'idle' | 'ringing' | 'offhook' | 'ended'

// 来电信息
interface IncomingCallInfo {
  callerNumber: string
  callId?: string        // 后端回传的 callId
  customerId?: string    // 后端匹配的客户ID
  customerName?: string  // 后端匹配的客户名
  state: IncomingState
  detectedAt: number     // 检测到来电的时间
  answeredAt?: number    // 接听时间
}

class IncomingCallService {
  private isListening = false
  private lastPhoneState: number = 0 // 0=IDLE, 1=RINGING, 2=OFFHOOK
  private checkTimer: number | null = null
  private currentIncoming: IncomingCallInfo | null = null

  // 防抖：避免同一个来电重复上报
  private lastReportedNumber: string = ''
  private lastReportedTime: number = 0
  private readonly REPORT_DEBOUNCE_MS = 10000 // 10秒内同号码不重复上报

  // 回调
  private onIncomingCallback: ((info: IncomingCallInfo) => void) | null = null
  private onIncomingEndCallback: ((info: IncomingCallInfo, duration: number) => void) | null = null

  /**
   * 启动来电监听
   * 应在 APP 启动并完成 WebSocket 连接后调用
   */
  startListening() {
    if (this.isListening) {
      console.log('[IncomingCallService] 已在监听中，跳过')
      return
    }

    console.log('[IncomingCallService] 启动来电监听')
    this.isListening = true
    this.lastPhoneState = 0

    // #ifdef APP-PLUS
    this.startAndroidListener()
    // #endif
  }

  /**
   * 停止来电监听
   */
  stopListening() {
    console.log('[IncomingCallService] 停止来电监听')
    this.isListening = false
    this.stopCheckTimer()
    this.currentIncoming = null
  }

  /**
   * Android 来电监听
   * 使用 TelephonyManager.listen(PhoneStateListener) 实现原生来电检测
   */
  private startAndroidListener() {
    try {
      const main = plus.android.runtimeMainActivity()
      const Context = plus.android.importClass('android.content.Context')
      const _TelephonyManager = plus.android.importClass('android.telephony.TelephonyManager')

      const telephonyManager = (main as any).getSystemService((Context as any).TELEPHONY_SERVICE)

      if (!telephonyManager) {
        console.error('[IncomingCallService] 无法获取 TelephonyManager，回退到轮询模式')
        this.startPollingFallback()
        return
      }

      // 创建 PhoneStateListener 代理
      // uni-app 的 plus.android 不能直接继承 Java 类，使用轮询检测状态变化
      // 但我们可以使用 BroadcastReceiver 方式监听 PHONE_STATE 广播
      this.registerPhoneStateBroadcast(main)

      console.log('[IncomingCallService] Android 来电广播监听已注册')
    } catch (e) {
      console.error('[IncomingCallService] Android 原生监听注册失败，回退到轮询:', e)
      this.startPollingFallback()
    }
  }

  /**
   * 注册 Android PHONE_STATE 广播接收器
   * 通过 BroadcastReceiver 监听来电事件，可获取来电号码
   */
  private registerPhoneStateBroadcast(main: any) {
    try {
      const IntentFilter = plus.android.importClass('android.content.IntentFilter')
      plus.android.importClass('android.telephony.TelephonyManager')

      const filter = new IntentFilter()
      ;(filter as any).addAction('android.intent.action.PHONE_STATE')

      // 创建 BroadcastReceiver 代理
      const receiver = plus.android.implements('io.dcloud.feature.internal.reflect.BroadcastReceiver', {
        onReceive: (_context: any, intent: any) => {
          try {
            const state = (intent as any).getStringExtra('state')
            const incomingNumber = (intent as any).getStringExtra('incoming_number') || ''

            console.log('[IncomingCallService] 广播收到状态:', state, '号码:', incomingNumber)

            if (state === 'RINGING' && incomingNumber) {
              this.onPhoneRinging(incomingNumber)
            } else if (state === 'OFFHOOK') {
              this.onPhoneOffhook()
            } else if (state === 'IDLE') {
              this.onPhoneIdle()
            }
          } catch (e) {
            console.error('[IncomingCallService] 广播处理异常:', e)
          }
        }
      })

      ;(main as any).registerReceiver(receiver, filter)

      // 保存 receiver 引用以便后续注销
      ;(this as any)._broadcastReceiver = receiver
      ;(this as any)._mainActivity = main

      console.log('[IncomingCallService] BroadcastReceiver 注册成功')
    } catch (e) {
      console.error('[IncomingCallService] BroadcastReceiver 注册失败:', e)
      // 回退到轮询
      this.startPollingFallback()
    }
  }

  /**
   * 来电振铃处理
   */
  private onPhoneRinging(callerNumber: string) {
    if (!this.isListening) return

    // 如果 callStateService 正在监听外呼通话，不处理（避免和外呼冲突）
    if (callStateService.isInCall()) {
      console.log('[IncomingCallService] 正在外呼通话中，忽略来电检测')
      return
    }

    // 防抖：同号码短时间内不重复上报
    const now = Date.now()
    if (callerNumber === this.lastReportedNumber &&
        (now - this.lastReportedTime) < this.REPORT_DEBOUNCE_MS) {
      console.log('[IncomingCallService] 同号码防抖，跳过:', callerNumber)
      return
    }

    console.log('[IncomingCallService] 检测到来电:', callerNumber)

    this.lastReportedNumber = callerNumber
    this.lastReportedTime = now

    // 创建来电信息
    this.currentIncoming = {
      callerNumber,
      state: 'ringing',
      detectedAt: now
    }

    // 1. 通过 WebSocket 发送 INCOMING_CALL_DETECTED
    this.sendIncomingCallDetected(callerNumber)

    // 2. 同时通过 HTTP 上报（WebSocket 可能不稳定时的备份）
    this.reportViaHttp(callerNumber)

    // 3. 触发回调
    if (this.onIncomingCallback && this.currentIncoming) {
      this.onIncomingCallback(this.currentIncoming)
    }
  }

  /**
   * 通话接听处理
   */
  private onPhoneOffhook() {
    if (!this.currentIncoming || this.currentIncoming.state !== 'ringing') return

    console.log('[IncomingCallService] 来电已接听')
    this.currentIncoming.state = 'offhook'
    this.currentIncoming.answeredAt = Date.now()

    // 如果有 callId，通过 WebSocket 上报接听状态
    if (this.currentIncoming.callId) {
      wsService.reportCallStatus(this.currentIncoming.callId, 'connected')
    }
  }

  /**
   * 通话结束（挂断）处理
   */
  private onPhoneIdle() {
    if (!this.currentIncoming) return
    if (this.currentIncoming.state === 'idle' || this.currentIncoming.state === 'ended') return

    console.log('[IncomingCallService] 来电通话结束')

    const wasAnswered = this.currentIncoming.state === 'offhook'
    this.currentIncoming.state = 'ended'

    // 计算通话时长
    let duration = 0
    if (wasAnswered && this.currentIncoming.answeredAt) {
      duration = Math.floor((Date.now() - this.currentIncoming.answeredAt) / 1000)
    }

    // 上报通话结束
    if (this.currentIncoming.callId) {
      wsService.reportCallEnd(this.currentIncoming.callId, {
        status: wasAnswered ? 'connected' : 'missed',
        startTime: new Date(this.currentIncoming.detectedAt).toISOString(),
        endTime: new Date().toISOString(),
        duration,
        hasRecording: false, // 呼入录音后续处理
        endReason: wasAnswered ? 'normal_hangup' : 'caller_hangup',
      })
    }

    // 触发回调
    if (this.onIncomingEndCallback && this.currentIncoming) {
      this.onIncomingEndCallback(this.currentIncoming, duration)
    }

    // 保存来电信息供跟进使用
    if (this.currentIncoming.callId) {
      uni.setStorageSync('lastEndedCall', {
        callId: this.currentIncoming.callId,
        customerName: this.currentIncoming.customerName || '',
        customerId: this.currentIncoming.customerId || '',
        phoneNumber: this.currentIncoming.callerNumber,
        duration,
        endTime: new Date().toISOString(),
        wasConnected: wasAnswered,
        hasRecording: false,
        isInbound: true,
      })
    }

    // 通话结束后跳转到跟进页面
    if (this.currentIncoming.callId && wasAnswered) {
      const info = this.currentIncoming
      setTimeout(() => {
        uni.navigateTo({
          url: `/pages/call-ended/index?callId=${info.callId}&name=${encodeURIComponent(info.customerName || '')}&customerId=${info.customerId || ''}&duration=${duration}&hasRecording=false&isInbound=true`,
        })
      }, 500)
    }

    // 重置状态
    this.currentIncoming = null
  }

  /**
   * 通过 WebSocket 发送 INCOMING_CALL_DETECTED
   */
  private sendIncomingCallDetected(callerNumber: string) {
    if (!wsService.isConnected) {
      console.warn('[IncomingCallService] WebSocket 未连接，仅通过 HTTP 上报')
      return
    }

    wsService.send('INCOMING_CALL_DETECTED', {
      callerNumber,
      timestamp: new Date().toISOString(),
    })

    console.log('[IncomingCallService] 已发送 INCOMING_CALL_DETECTED:', callerNumber)
  }

  /**
   * 通过 HTTP 上报来电（WebSocket 备份通道）
   */
  private async reportViaHttp(callerNumber: string) {
    try {
      const result = await reportIncomingCall({ callerNumber })
      if (result && result.callId) {
        // HTTP 上报也返回了 callId，更新来电信息
        if (this.currentIncoming && this.currentIncoming.callerNumber === callerNumber) {
          this.currentIncoming.callId = this.currentIncoming.callId || result.callId
          this.currentIncoming.customerName = this.currentIncoming.customerName || result.customerName
          this.currentIncoming.customerId = this.currentIncoming.customerId || result.customerId
        }
      }
    } catch (e) {
      console.error('[IncomingCallService] HTTP 来电上报失败:', e)
      // 不阻断流程，WebSocket 通道仍在工作
    }
  }

  /**
   * 处理后端回传的 INCOMING_CALL_CONFIRMED
   * 由 websocket.ts 调用
   */
  handleIncomingCallConfirmed(data: {
    callId: string
    callerNumber: string
    customerName?: string
    customerId?: string
  }) {
    console.log('[IncomingCallService] 收到来电确认:', data)

    if (this.currentIncoming && this.currentIncoming.callerNumber === data.callerNumber) {
      this.currentIncoming.callId = data.callId
      this.currentIncoming.customerName = data.customerName
      this.currentIncoming.customerId = data.customerId

      console.log('[IncomingCallService] 来电信息已更新, callId:', data.callId)
    } else {
      console.warn('[IncomingCallService] 收到确认但无匹配的来电, 可能已结束')
    }
  }

  /**
   * 轮询回退方案
   * 当 BroadcastReceiver 注册失败时使用
   * 每500ms检测 TelephonyManager.getCallState() 变化
   */
  private startPollingFallback() {
    console.log('[IncomingCallService] 启动轮询模式检测来电')
    this.stopCheckTimer()

    this.checkTimer = setInterval(() => {
      if (!this.isListening) return
      this.pollPhoneState()
    }, 500) as unknown as number
  }

  /**
   * 轮询检测通话状态
   */
  private pollPhoneState() {
    // #ifdef APP-PLUS
    try {
      // 如果外呼正在进行，不检测来电
      if (callStateService.isInCall()) return

      const main = plus.android.runtimeMainActivity()
      const Context = plus.android.importClass('android.content.Context')
      plus.android.importClass('android.telephony.TelephonyManager')

      const telephonyManager = (main as any).getSystemService((Context as any).TELEPHONY_SERVICE)
      const callState = telephonyManager.getCallState()

      // 状态变化检测
      if (callState !== this.lastPhoneState) {
        console.log('[IncomingCallService] 轮询检测状态变化:', this.lastPhoneState, '->', callState)

        if (callState === 1 && this.lastPhoneState === 0) {
          // IDLE -> RINGING：来电
          // 轮询模式无法直接获取来电号码，使用空号码
          // 实际场景中需配合 READ_CALL_LOG 权限读取最近来电
          const callerNumber = this.getLatestIncomingNumber() || 'unknown'
          this.onPhoneRinging(callerNumber)
        } else if (callState === 2) {
          // OFFHOOK：接听
          this.onPhoneOffhook()
        } else if (callState === 0) {
          // IDLE：挂断
          this.onPhoneIdle()
        }

        this.lastPhoneState = callState
      }
    } catch (e) {
      console.error('[IncomingCallService] 轮询检测失败:', e)
    }
    // #endif
  }

  /**
   * 尝试从通话记录获取最近来电号码
   * 需要 READ_CALL_LOG 权限
   */
  private getLatestIncomingNumber(): string {
    // #ifdef APP-PLUS
    try {
      const main = plus.android.runtimeMainActivity()
      const _ContentResolver = plus.android.importClass('android.content.ContentResolver')
      const CallLog = plus.android.importClass('android.provider.CallLog')

      const contentResolver = (main as any).getContentResolver()
      const cursor = (contentResolver as any).query(
        (CallLog as any).Calls.CONTENT_URI,
        ['number', 'type', 'date'],
        'type = ?',
        ['1'], // 1 = INCOMING_TYPE
        'date DESC'
      )

      if (cursor && (cursor as any).moveToFirst()) {
        const number = (cursor as any).getString(0)
        const callDate = (cursor as any).getLong(2)
        ;(cursor as any).close()

        // 只取最近10秒内的来电记录
        if (Date.now() - callDate < 10000) {
          return number
        }
      }

      if (cursor) {
        ;(cursor as any).close()
      }
    } catch (e) {
      console.error('[IncomingCallService] 读取通话记录失败:', e)
    }
    // #endif
    return ''
  }

  /**
   * 停止轮询定时器
   */
  private stopCheckTimer() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer)
      this.checkTimer = null
    }
  }

  /**
   * 获取当前来电信息
   */
  getCurrentIncoming(): IncomingCallInfo | null {
    return this.currentIncoming
  }

  /**
   * 是否正在处理来电
   */
  hasActiveIncoming(): boolean {
    return this.currentIncoming !== null &&
           (this.currentIncoming.state === 'ringing' || this.currentIncoming.state === 'offhook')
  }

  /**
   * 设置来电检测回调
   */
  onIncoming(callback: (info: IncomingCallInfo) => void) {
    this.onIncomingCallback = callback
  }

  /**
   * 设置来电结束回调
   */
  onIncomingEnd(callback: (info: IncomingCallInfo, duration: number) => void) {
    this.onIncomingEndCallback = callback
  }

  /**
   * 销毁服务，注销广播接收器
   */
  destroy() {
    this.stopListening()

    // #ifdef APP-PLUS
    try {
      const receiver = (this as any)._broadcastReceiver
      const main = (this as any)._mainActivity
      if (receiver && main) {
        ;(main as any).unregisterReceiver(receiver)
        console.log('[IncomingCallService] BroadcastReceiver 已注销')
      }
    } catch (e) {
      console.error('[IncomingCallService] 注销 BroadcastReceiver 失败:', e)
    }
    // #endif
  }
}

// 导出单例
export const incomingCallService = new IncomingCallService()
export default incomingCallService
