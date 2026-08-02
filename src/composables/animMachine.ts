/** 动画状态机：显式状态 + 转移规则（纯逻辑，可单测） */

export const ANIM_MACHINE_STATES = [
  'loading',
  'idle',
  'reminding',
  'snoozing',
  'moving',
  'action',
] as const

export type AnimMachineState = (typeof ANIM_MACHINE_STATES)[number]

export type AnimPriority = 'business' | 'normal'

export interface TransitionRequest {
  from: AnimMachineState
  to: AnimMachineState
  priority?: AnimPriority
}

/**
 * 判断状态转移是否允许。
 * 规则：
 * - loading：任何状态可进入（切宠物）
 * - reminding / snoozing：业务状态，仅 business 优先级可抢占
 * - idle：可从 loading（加载完成）/ action（播完）/ moving（移动结束）进入，business 可强制
 * - moving：仅 idle 进入（wander 生命周期）
 * - action：仅 idle 进入（点击/随机动作），moving 可打断（行走中点击立即响应）
 */
export function canTransition(
  from: AnimMachineState,
  to: AnimMachineState,
  priority: AnimPriority = 'normal',
): boolean {
  if (from === to) return true
  switch (to) {
    case 'loading':
      return true
    case 'reminding':
    case 'snoozing':
      return priority === 'business'
    case 'idle':
      return priority === 'business' || from === 'loading' || from === 'action' || from === 'moving'
    case 'moving':
      return from === 'idle'
    case 'action':
      return from === 'idle' || from === 'moving'
    default:
      return false
  }
}

/** 获取状态的默认动画名（idle/reminding/snoozing 与动画 key 同名） */
export function defaultAnimForState(state: AnimMachineState): string {
  return state === 'loading' ? '' : state
}
