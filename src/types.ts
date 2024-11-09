import type { RemoteDom } from "./RemoteDom.ts"

/**
 * 定义远程连接器的事件映射，用于描述支持的事件类型及其对应的事件数据
 */
export interface IRemoteConnectorEventMap {
  /** 表示接收到的消息 */
  message: string
  /** 表示连接关闭 */
  close: void
  /** 表示发生错误 */
  error: Event
  /** 表示连接已打开 */
  open: void
}

/**
 * 定义远程连接器接口，用于与远程服务进行通信
 */
export interface IRemoteConnector {
  /**
   * 发送数据到远程服务
   * @param data 要发送的数据，可以是字符串、数组缓冲区视图或数组缓冲区
   */
  send(data: String | ArrayBufferView | ArrayBuffer): void

  /**
   * 关闭与远程服务的连接
   */
  close(): void

  /**
   * 添加事件监听器，以处理特定类型的事件
   * @param type 事件类型，必须是RemoteConnectorEventMap中的键之一
   * @param listener 事件处理函数，接收特定事件类型对应的数据
   */
  addEventListener<E extends keyof IRemoteConnectorEventMap>(
    type: E,
    listener: (arg: IRemoteConnectorEventMap[E]) => void
  ): void

  /**
   * 删除事件监听器
   * @param type 事件类型，必须是RemoteConnectorEventMap中的键之一
   * @param listener 事件处理函数，接收特定事件类型对应的数据
   */
  removeEventListener<E extends keyof IRemoteConnectorEventMap>(
    type: E,
    listener: (arg: IRemoteConnectorEventMap[E]) => void
  ): void
}
/**
 * 定义一个远程命令接口，用于指定命令的类型
 * @template Type - 命令的类型，默认为字符串
 */
export interface IRemoteCommand<Type extends string = string> {
  // 命令的具体类型
  type: Type
}

/**
 * 定义一个远程命令处理程序接口，用于处理特定类型的远程命令
 * @template CmdType - 命令的类型，默认为字符串
 */
export interface IRemoteCommandHandler<CmdType extends string = string> {
  // 此处理程序所处理的命令类型
  readonly for: CmdType

  /**
   * 处理特定类型的远程命令
   * @param cmd - 要处理的远程命令
   */
  handle(cmd: IRemoteCommand<CmdType>): void
}

/**
 * 定义一个远程插件接口，允许插件向RemoteDom注册命令处理程序，并响应连接器事件
 */
export interface IRemoteAddon {
  /**
   * 返回一组命令处理程序
   * @returns 返回一组命令处理程序
   */
  use(): IRemoteCommandHandler[]

  /**
   * 可选地处理连接打开事件
   * @param arg - 事件的具体信息
   */
  handleOpen?(arg: IRemoteConnectorEventMap["open"]): void

  /**
   * 可选地处理错误事件
   * @param arg - 事件的具体信息
   */
  handleError?(arg: IRemoteConnectorEventMap["error"]): void

  /**
   * 可选地处理连接关闭事件
   * @param arg - 事件的具体信息
   */
  handleClose?(arg: IRemoteConnectorEventMap["close"]): void
}
