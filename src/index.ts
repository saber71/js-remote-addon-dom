import {
  type IRemoteAddon,
  type IRemoteCommand,
  type IRemoteCommandHandler,
  type IRemoteCommandReplyable,
  type Remote
} from "@heraclius/remote"

/**
 * 定义创建DOM元素的远程命令接口
 * @extends IRemoteCommand<"create-dom">
 */
interface IRemoteCommandCreateDom extends IRemoteCommand<"create-dom"> {
  // 元素类型
  element: string
  // 父元素ID
  parent?: string
  // 属性
  attributes?: Record<string, any>
  // 子元素
  children?: IRemoteCommandCreateDom[]
  // 文本内容
  textContent?: string
  // 是否需要加入到DOM树中
  independent?: boolean
  // 监听的事件
  listenEvents?: string[]
}

/**
 * 定义移除DOM元素的远程命令接口
 * @extends IRemoteCommand<"remove-dom">
 */
interface IRemoteCommandRemoveDom extends IRemoteCommand<"remove-dom"> {
  id: string
}

/**
 * 定义更新DOM元素的远程命令接口
 * @extends IRemoteCommand<"update-dom">
 */
interface IRemoteCommandUpdateDom extends IRemoteCommand<"update-dom"> {
  // 元素id
  id: string
  attributes?: Record<string, any>
  parent?: string
  textContent?: string
  listenEvents?: string[]
  // 停止监听的事件
  stopListenEvents?: string[]
}

/**
 * 定义获取DOM元素边界矩形的远程命令接口
 * @extends IRemoteCommandReplyable<"get-bounding-rect">
 */
interface IRemoteCommandGetBoundingRect extends IRemoteCommandReplyable<"get-bounding-rect"> {
  // 元素id
  id: string
}

/**
 * 定义读取DOM元素的属性的远程命令接口
 */
interface IRemoteCommandReadProps extends IRemoteCommandReplyable<"read-props"> {
  // 元素id
  id: string
  // 要读取的属性名称列表
  props: string[]
}

/**
 * 定义调用DOM元素的方法的远程命令接口
 */
interface IRemoteCommandInvokeMethod extends IRemoteCommandReplyable<"invoke-method"> {
  // 元素id
  id: string
  // 要调用的方法名称
  methodName: string
  // 调用方法传入的参数
  args?: any[]
}

// 存储元素的映射
const elementMap = new Map<string, HTMLElement>()
// 存储元素监听器的映射
const elementListeners = new Map<HTMLElement, Map<string, (e: Event) => void>>()

/**
 * 停止监听指定事件
 * @param element 目标元素
 * @param event 事件类型
 */
function stopListenEvent(element: HTMLElement, event: string) {
  const map = elementListeners.get(element)
  if (map) {
    const listener = map.get(event)
    if (listener) {
      element.removeEventListener(event, listener)
      map.delete(event)
    }
  }
}

/**
 * 监听指定事件
 * @param element 目标元素
 * @param event 事件类型
 * @param remote 远程实例
 */
function listenEvent(element: HTMLElement, event: string, remote: Remote) {
  let map = elementListeners.get(element)
  if (!map) elementListeners.set(element, (map = new Map()))
  if (!map.has(event)) {
    map.set(event, listener)
    element.addEventListener(event, listener)
  }

  /**
   * 事件监听器
   * @param e 事件对象
   */
  function listener(e: Event) {
    let data = ""
    if (e instanceof MouseEvent) {
      data = JSON.stringify({
        x: e.x,
        y: e.y
      })
    } else if (e instanceof WheelEvent) {
      data = JSON.stringify({
        x: e.x,
        y: e.y,
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        deltaZ: e.deltaZ
      })
    } else if (e instanceof InputEvent) {
      data = (e.target as HTMLInputElement).value
    }
    remote.sendMessage({
      subject: "dispatch:" + event,
      data
    })
  }
}

/**
 * 创建DOM元素
 * @param cmd 创建命令
 * @param remote 远程实例
 * @returns 创建的DOM元素
 */
function createDom(cmd: IRemoteCommandCreateDom, remote: Remote) {
  const el = document.createElement(cmd.element)
  if (cmd.attributes) {
    for (let key in cmd.attributes) {
      const value = cmd.attributes[key]
      if (value != null) el.setAttribute(key, value)
      if (key == "id") {
        if (elementMap.has(value)) remote.sendError(`id ${value} 已重复`)
        else elementMap.set(value, el)
      }
    }
  }
  if (cmd.children) {
    for (let child of cmd.children) {
      el.appendChild(createDom(child, remote))
    }
  }
  if (cmd.parent || !cmd.independent) {
    const parent = elementMap.get(cmd.parent || "body")
    parent?.appendChild(el)
  }
  if (cmd.listenEvents) cmd.listenEvents.forEach((event) => listenEvent(el, event, remote))
  el.innerText = cmd.textContent || ""
  return el
}

/**
 * 移除DOM元素
 */
function removeDom(cmd: IRemoteCommandRemoveDom, remote: Remote) {
  const element = elementMap.get(cmd.id)
  if (element) remove(element)
  else remote.sendError(`找不到id ${cmd.id} 对应的元素`)

  /**
   * 递归移除元素及其子元素
   * @param element 目标元素
   */
  function remove(element: HTMLElement) {
    element.remove()
    elementMap.delete(element.id)
    while (element.children.length) {
      const child = element.children[0]
      if (child instanceof HTMLElement) {
        remove(child)
      } else {
        child.remove()
      }
    }
  }
}

/**
 * 远程DOM操作插件类
 */
export class RemoteAddonDom implements IRemoteAddon {
  /**
   * 注册远程命令处理器
   * @param remote 远程实例
   * @returns 远程命令处理器数组
   */
  use(remote: Remote): IRemoteCommandHandler[] {
    return [
      {
        for: "create-dom",
        handle(cmd: IRemoteCommandCreateDom) {
          createDom(cmd, remote)
        }
      },
      {
        for: "remove-dom",
        handle(cmd: IRemoteCommandRemoveDom) {
          removeDom(cmd, remote)
        }
      },
      {
        for: "update-dom",
        handle(cmd: IRemoteCommandUpdateDom) {
          const element = elementMap.get(cmd.id)
          if (element) {
            if (cmd.attributes) {
              for (let key in cmd.attributes) {
                const value = cmd.attributes[key]
                if (value == null) element.removeAttribute(key)
                else element.setAttribute(key, value)
              }
            }
            if (cmd.parent) {
              const parent = element.parentElement
              if (parent) element.remove()
              elementMap.get(cmd.parent || "body")?.appendChild(element)
            }
            if (typeof cmd.textContent === "string") element.innerText = cmd.textContent
            cmd.listenEvents?.forEach((event) => listenEvent(element, event, remote))
            cmd.stopListenEvents?.forEach((event) => stopListenEvent(element, event))
          } else remote.sendError(`找不到id ${cmd.id} 对应的元素`)
        }
      },
      {
        for: "get-bounding-rect",
        handle(cmd: IRemoteCommandGetBoundingRect) {
          const element = elementMap.get(cmd.id)
          if (!element) {
            remote.sendError(`找不到id ${cmd.id} 对应的元素`)
            return
          }
          const boundingRect = element.getBoundingClientRect()
          remote.reply({
            replyId: cmd.replyId,
            data: boundingRect ? JSON.stringify(boundingRect) : ""
          })
        }
      },
      {
        for: "read-props",
        handle(cmd: IRemoteCommandReadProps) {
          const element = elementMap.get(cmd.id)
          if (!element) {
            remote.sendError(`找不到id ${cmd.id} 对应的元素`)
            return
          }
          remote.reply({
            replyId: cmd.replyId,
            data: JSON.stringify(cmd.props.map((prop) => (element as any)[prop] ?? null))
          })
        }
      },
      {
        for: "invoke-method",
        handle(cmd: IRemoteCommandInvokeMethod) {
          const element = elementMap.get(cmd.id)
          if (!element) {
            remote.sendError(`找不到id ${cmd.id} 对应的元素`)
            return
          }
          const method: Function | undefined = (element as any)[cmd.methodName]
          if (method) {
            const returnValue = method.call(element, ...(cmd.args || []))
            let data = ""
            if (returnValue !== undefined && returnValue !== null) data = JSON.stringify(returnValue)
            remote.reply({
              replyId: cmd.replyId,
              data
            })
          } else remote.sendError(`找不到 ${cmd.methodName} 方法`)
        }
      }
    ]
  }

  /**
   * 当插件被加载时调用
   */
  handleOpen(): void {
    elementMap.set("body", document.body)
  }

  /**
   * 当插件被卸载时调用
   */
  handleClose(): void {
    elementMap.clear()
  }
}
