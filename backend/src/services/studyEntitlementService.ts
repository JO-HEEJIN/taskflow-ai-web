import { v4 as uuidv4 } from 'uuid';
import { cosmosService } from './cosmosService';
import { Entitlement } from '../types/study';

// Server-side entitlements. The only writer is the verified Lemon Squeezy webhook;
// clients can never grant themselves access, they can only read their own state.
class StudyEntitlementService {
  async list(ownerRef: string): Promise<Entitlement[]> {
    const container = cosmosService.getContainer('studyEntitlements');
    const { resources } = await container.items
      .query<Entitlement>({
        query: 'SELECT * FROM c WHERE c.ownerRef = @o',
        parameters: [{ name: '@o', value: ownerRef }],
      })
      .fetchAll();
    return resources;
  }

  async has(ownerRef: string, scope: Entitlement['scope']): Promise<boolean> {
    const container = cosmosService.getContainer('studyEntitlements');
    const { resources } = await container.items
      .query<{ id: string }>({
        query: 'SELECT TOP 1 c.id FROM c WHERE c.ownerRef = @o AND c.scope = @s',
        parameters: [
          { name: '@o', value: ownerRef },
          { name: '@s', value: scope },
        ],
      })
      .fetchAll();
    return resources.length > 0;
  }

  // Grant an entitlement. Called only from the verified webhook handler.
  // Idempotent on (ownerRef, scope, lemonsqueezyOrderId).
  async grant(
    ownerRef: string,
    scope: Entitlement['scope'],
    details: { lemonsqueezyOrderId?: string; licenseKey?: string; email?: string } = {}
  ): Promise<Entitlement> {
    const existing = await this.list(ownerRef);
    const dup = existing.find(
      (e) => e.scope === scope && e.lemonsqueezyOrderId === details.lemonsqueezyOrderId
    );
    if (dup) return dup;
    const container = cosmosService.getContainer('studyEntitlements');
    const entitlement: Entitlement = {
      id: uuidv4(),
      ownerRef,
      scope,
      lemonsqueezyOrderId: details.lemonsqueezyOrderId,
      licenseKey: details.licenseKey,
      email: details.email,
      createdAt: new Date().toISOString(),
    };
    await container.items.upsert(entitlement);
    return entitlement;
  }
}

export const studyEntitlementService = new StudyEntitlementService();
