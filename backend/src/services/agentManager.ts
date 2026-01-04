import Elysia from "elysia";
import { EventEmitter } from "events";

interface EventMap extends Record<string, any[]> {
	"agent/connected": [{ agentId: string }];
	"agent/disconnected": [{ agentId: string }];
}

export class AgentManager extends EventEmitter<EventMap> {
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
