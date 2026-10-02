import { db } from '../memory';
import { Client, PaginatedResponse } from '../types';
import { AppError } from '../utils/errors';
import { CreateClientInput } from '../utils/validation';

export class ClientService {
  async getClients(params: {
    page: number;
    pageSize: number;
    search?: string;
    isActive?: boolean;
  }): Promise<PaginatedResponse<Client>> {
    const { page, pageSize, search, isActive } = params;
    
    let clients = db.findMany(db.clients, c => {
      if (isActive !== undefined && c.isActive !== isActive) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!c.fullName.toLowerCase().includes(s) &&
            !c.code.toLowerCase().includes(s) &&
            !(c.email?.toLowerCase().includes(s)) &&
            !(c.phone?.includes(s))) return false;
      }
      return true;
    });

    clients.sort((a, b) => a.fullName.localeCompare(b.fullName));

    const total = clients.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = clients.slice(start, start + pageSize);

    return { data, total, page, pageSize, totalPages };
  }

  async getClientById(id: string) {
    const client = db.findById(db.clients, id);
    if (!client) throw AppError.notFound('CLIENT_NOT_FOUND', 'Cliente no encontrado');
    return client;
  }

  async createClient(data: CreateClientInput) {
    const code = db.getNextClientCode();
    const now = new Date();
    const client: Client = {
      id: db.generateId('cli_'),
      code,
      ...data,
      currentBalance: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    db.clients.set(client.id, client);
    return client;
  }

  async updateClient(id: string, data: Partial<Client>) {
    const client = db.findById(db.clients, id);
    if (!client) throw AppError.notFound('CLIENT_NOT_FOUND', 'Cliente no encontrado');

    const updated = db.update(db.clients, id, data);
    return updated!;
  }

  async toggleClientStatus(id: string) {
    const client = db.findById(db.clients, id);
    if (!client) throw AppError.notFound('CLIENT_NOT_FOUND', 'Cliente no encontrado');

    const updated = db.update(db.clients, id, { isActive: !client.isActive });
    return updated!;
  }

  async getClientBalance(id: string) {
    const client = db.findById(db.clients, id);
    if (!client) throw AppError.notFound('CLIENT_NOT_FOUND', 'Cliente no encontrado');

    // Get recent sales
    const sales = db.findMany(db.sales, s => s.clientId === id && s.status === 'CONFIRMED')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    return {
      client,
      currentBalance: client.currentBalance,
      creditLimit: client.creditLimit,
      availableCredit: client.creditLimit - client.currentBalance,
      recentSales: sales.map(s => ({
        id: s.id,
        folio: s.folio,
        date: s.createdAt,
        total: s.total,
        status: s.status
      }))
    };
  }

  async makePayment(clientId: string, amount: number, method: string, reference: string, receivedBy: string) {
    const client = db.findById(db.clients, clientId);
    if (!client) throw AppError.notFound('CLIENT_NOT_FOUND', 'Cliente no encontrado');

    if (amount <= 0) throw AppError.badRequest('INVALID_AMOUNT', 'Monto inválido');
    if (amount > client.currentBalance) throw AppError.badRequest('AMOUNT_EXCEEDS_BALANCE', 'El monto excede el saldo pendiente');

    db.update(db.clients, clientId, { 
      currentBalance: client.currentBalance - amount 
    });

    // Log activity
    const log = {
      id: db.generateId('log_'),
      userId: receivedBy,
      action: 'CLIENT_PAYMENT',
      entityType: 'CLIENT',
      entityId: clientId,
      metadata: { amount, method, reference },
      createdAt: new Date()
    };
    db.activityLogs.set(log.id, log);

    return { success: true, newBalance: client.currentBalance - amount };
  }
}