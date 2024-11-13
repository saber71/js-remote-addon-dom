// 存储元素的映射
const elementMap = new Map();
// 存储元素监听器的映射
const elementListeners = new Map();
/**
 * 停止监听指定事件
 * @param element 目标元素
 * @param event 事件类型
 */ function stopListenEvent(element, event) {
    const map = elementListeners.get(element);
    if (map) {
        const listener = map.get(event);
        if (listener) {
            element.removeEventListener(event, listener);
            map.delete(event);
        }
    }
}
/**
 * 监听指定事件
 * @param element 目标元素
 * @param event 事件类型
 * @param remote 远程实例
 */ function listenEvent(element, event, remote) {
    let map = elementListeners.get(element);
    if (!map) elementListeners.set(element, map = new Map());
    if (!map.has(event)) {
        map.set(event, listener);
        element.addEventListener(event, listener);
    }
    /**
   * 事件监听器
   * @param e 事件对象
   */ function listener(e) {
        let data = "";
        if (e instanceof MouseEvent) {
            data = JSON.stringify({
                x: e.x,
                y: e.y
            });
        } else if (e instanceof WheelEvent) {
            data = JSON.stringify({
                x: e.x,
                y: e.y,
                deltaX: e.deltaX,
                deltaY: e.deltaY,
                deltaZ: e.deltaZ
            });
        } else if (e instanceof InputEvent) {
            data = e.target.value;
        }
        remote.sendMessage({
            subject: "dispatch:" + event,
            data
        });
    }
}
/**
 * 创建DOM元素
 * @returns 创建的DOM元素
 */ function createDom(cmd, remote, parent) {
    const el = document.createElement(cmd.element);
    if (cmd.attributes) {
        for(let key in cmd.attributes){
            const value = cmd.attributes[key];
            if (value != null) el.setAttribute(key, value);
            if (key == "id") {
                if (elementMap.has(value)) remote.sendError(`id ${value} 已重复`);
                else elementMap.set(value, el);
            }
        }
    }
    if (cmd.children) {
        for (let child of cmd.children){
            createDom(child, remote, el);
        }
    }
    if (parent) {
        parent.appendChild(el);
    } else if (cmd.parent || !cmd.independent) {
        const parent = elementMap.get(cmd.parent || "body");
        parent?.appendChild(el);
    }
    if (cmd.listenEvents) cmd.listenEvents.forEach((event)=>listenEvent(el, event, remote));
    if (cmd.textContent) el.innerText = cmd.textContent;
    return el;
}
/**
 * 移除DOM元素
 */ function removeDom(cmd, remote) {
    const element = elementMap.get(cmd.id);
    if (element) remove(element);
    else remote.sendError(`找不到id ${cmd.id} 对应的元素`);
    /**
   * 递归移除元素及其子元素
   * @param element 目标元素
   */ function remove(element) {
        element.remove();
        elementMap.delete(element.id);
        while(element.children.length){
            const child = element.children[0];
            if (child instanceof HTMLElement) {
                remove(child);
            } else {
                child.remove();
            }
        }
    }
}
/**
 * 远程DOM操作插件类
 */ class RemoteAddonDom {
    /**
   * 注册远程命令处理器
   * @param remote 远程实例
   * @returns 远程命令处理器数组
   */ use(remote) {
        return [
            {
                for: "create-dom",
                handle (cmd) {
                    createDom(cmd, remote);
                }
            },
            {
                for: "remove-dom",
                handle (cmd) {
                    removeDom(cmd, remote);
                }
            },
            {
                for: "update-dom",
                handle (cmd) {
                    const element = elementMap.get(cmd.id);
                    if (element) {
                        if (cmd.attributes) {
                            for(let key in cmd.attributes){
                                const value = cmd.attributes[key];
                                if (value == null) element.removeAttribute(key);
                                else element.setAttribute(key, value);
                            }
                        }
                        if (cmd.parent) {
                            const parent = element.parentElement;
                            if (parent) element.remove();
                            elementMap.get(cmd.parent || "body")?.appendChild(element);
                        }
                        if (typeof cmd.textContent === "string") element.innerText = cmd.textContent;
                        cmd.listenEvents?.forEach((event)=>listenEvent(element, event, remote));
                        cmd.stopListenEvents?.forEach((event)=>stopListenEvent(element, event));
                    } else remote.sendError(`找不到id ${cmd.id} 对应的元素`);
                }
            },
            {
                for: "get-bounding-rect",
                handle (cmd) {
                    const element = elementMap.get(cmd.id);
                    if (!element) {
                        remote.sendError(`找不到id ${cmd.id} 对应的元素`);
                        return;
                    }
                    const boundingRect = element.getBoundingClientRect();
                    remote.reply({
                        replyId: cmd.replyId,
                        data: boundingRect ? JSON.stringify(boundingRect) : ""
                    });
                }
            },
            {
                for: "read-props",
                handle (cmd) {
                    const element = elementMap.get(cmd.id);
                    if (!element) {
                        remote.sendError(`找不到id ${cmd.id} 对应的元素`);
                        return;
                    }
                    remote.reply({
                        replyId: cmd.replyId,
                        data: JSON.stringify(cmd.props.map((prop)=>element[prop] ?? null))
                    });
                }
            },
            {
                for: "invoke-method",
                handle (cmd) {
                    const element = elementMap.get(cmd.id);
                    if (!element) {
                        remote.sendError(`找不到id ${cmd.id} 对应的元素`);
                        return;
                    }
                    const method = element[cmd.methodName];
                    if (method) {
                        const returnValue = method.call(element, ...cmd.args || []);
                        let data = "";
                        if (returnValue !== undefined && returnValue !== null) data = JSON.stringify(returnValue);
                        remote.reply({
                            replyId: cmd.replyId,
                            data
                        });
                    } else remote.sendError(`找不到 ${cmd.methodName} 方法`);
                }
            }
        ];
    }
    /**
   * 当插件被加载时调用
   */ handleOpen() {
        elementMap.set("body", document.body);
        elementMap.set("head", document.head);
    }
    /**
   * 当插件被卸载时调用
   */ handleClose() {
        elementMap.clear();
    }
}

export { RemoteAddonDom };
