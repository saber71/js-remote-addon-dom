import { IRemoteAddon } from '@heraclius/remote';
import { IRemoteCommandHandler } from '@heraclius/remote';
import { Remote } from '@heraclius/remote';

/**
 * 远程DOM操作插件类
 */
export declare class RemoteAddonDom implements IRemoteAddon {
    /**
     * 注册远程命令处理器
     * @param remote 远程实例
     * @returns 远程命令处理器数组
     */
    use(remote: Remote): IRemoteCommandHandler[];
    /**
     * 当插件被加载时调用
     */
    handleOpen(): void;
    /**
     * 当插件被卸载时调用
     */
    handleClose(): void;
}

export { }
