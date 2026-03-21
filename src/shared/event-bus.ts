import { DomainEvent, EventBus } from './types.js';

type EventHandler = (event: DomainEvent) => void;

export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, EventHandler[]>();
  private history: DomainEvent[] = [];

  emit(event: DomainEvent): void {
    this.history.push(event);
    const handlers = this.handlers.get(event.type) ?? [];
    for (const handler of handlers) {
      handler(event);
    }
  }

  on(type: DomainEvent['type'], handler: EventHandler): void {
    const existing = this.handlers.get(type) ?? [];
    existing.push(handler);
    this.handlers.set(type, existing);
  }

  getHistory(): readonly DomainEvent[] {
    return this.history;
  }

  clear(): void {
    this.history = [];
  }
}
