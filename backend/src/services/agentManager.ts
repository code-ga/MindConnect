import Elysia from "elysia";
import { EventEmitter } from "events";

export class AgentManager extends EventEmitter {
	instanceId: string;
	constructor() {
		super();
		this.instanceId = crypto.randomUUID();
    console.log(`AgentManager initialized with instanceId: ${this.instanceId}`);
	}
}

export const agentManagerService = new Elysia({
	name: "service/agent-manager",
}).decorate("agentManager", new AgentManager());
