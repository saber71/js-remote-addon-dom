import {
  type IRemoteAddon,
  type IRemoteCommand,
  type IRemoteCommandHandler,
  type IRemoteCommandReplyable,
  type Remote
} from "@heraclius/remote"

interface IRemoteCommandCreateDom extends IRemoteCommand<"create-dom"> {
  element: string
  parent?: string
  attributes?: Record<string, any>
  children?: IRemoteCommandCreateDom[]
  textContent?: string
  independent?: boolean
}

interface IRemoteCommandRemoveDom extends IRemoteCommand<"remove-dom"> {
  id: string
}

interface IRemoteCommandUpdateDom extends IRemoteCommand<"update-dom"> {
  id: string
  attributes?: Record<string, any>
  parent?: string
  textContent?: string
}

interface IRemoteCommandGetBoundingRect extends IRemoteCommandReplyable<"get-bounding-rect"> {
  id: string
}

const elementMap = new Map<string, HTMLElement>()

function createDom(cmd: IRemoteCommandCreateDom) {
  const el = document.createElement(cmd.element)
  if (cmd.attributes) {
    for (let key in cmd.attributes) {
      const value = cmd.attributes[key]
      if (value != null) el.setAttribute(key, value)
      if (key == "id") elementMap.set(value, el)
    }
  }
  if (cmd.children) {
    for (let child of cmd.children) {
      el.appendChild(createDom(child))
    }
  }
  if (cmd.parent || !cmd.independent) {
    const parent = elementMap.get(cmd.parent || "body")
    parent?.appendChild(el)
  }
  el.innerText = cmd.textContent || ""
  return el
}

function removeDom(cmd: IRemoteCommandRemoveDom) {
  const element = elementMap.get(cmd.id)
  if (element) remove(element)

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

export class RemoteAddonDom implements IRemoteAddon {
  use(remote: Remote): IRemoteCommandHandler[] {
    return [
      {
        for: "create-dom",
        handle(cmd: IRemoteCommandCreateDom) {
          createDom(cmd)
        }
      },
      {
        for: "remove-dom",
        handle(cmd: IRemoteCommandRemoveDom) {
          removeDom(cmd)
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
          }
        }
      },
      {
        for: "get-bounding-rect",
        handle(cmd: IRemoteCommandGetBoundingRect) {
          const boundingRect = elementMap.get(cmd.id)?.getBoundingClientRect()
          remote.reply({
            replyId: cmd.replyId,
            data: boundingRect ? JSON.stringify(boundingRect) : ""
          })
        }
      }
    ]
  }

  handleOpen(): void {
    elementMap.set("body", document.body)
  }

  handleClose(): void {
    elementMap.clear()
  }
}
