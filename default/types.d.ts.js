interface Memory {
    spawnQueue: any[];
    attackMission: {
        manualRally?: {
            x: number;
            y: number;
            roomName: string;
        };
    };
    carrierMission: {
        containers: string[];
    };
    longdismine: {
        energy_used: number;
        count: number;
    };
}

interface CreepMemory {
    role: string;
    targetRoom?: string;
    targetPos?: {
        x: number;
        y: number;
    };
    attack_state?: string;
    targetRallySignature?: {
        x: number;
        y: number;
        roomName: string;
    };
    regroupRallyPoint?: {
        x: number;
        y: number;
        roomName: string;
    };
}

// 添加全局变量声明
declare namespace NodeJS {
    interface Global {
        ss: any;
        extensionPlanner: any;
    }
} 