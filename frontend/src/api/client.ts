import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'react-hot-toast';
import { User } from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const newToken = await this.refreshToken();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch {
            this.logout();
            window.location.href = '/login';
          }
        }
        
        const message = error.response?.data?.message || error.message || 'Error inesperado';
        if (error.response?.status !== 401) {
          toast.error(message);
        }
        return Promise.reject(error);
      }
    );
  }

  private async refreshToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');

      const response = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
      const { accessToken } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      return accessToken;
    })();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  // Auth
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = response.data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  }

  async register(email: string, password: string, fullName: string) {
    const response = await this.client.post('/auth/register', { email, password, fullName });
    return response.data;
  }

  async getProfile() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async updateProfile(data: Partial<User>) {
    const response = await this.client.put('/auth/me', data);
    if (response.data.data) {
      localStorage.setItem('user', JSON.stringify(response.data.data));
    }
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await this.client.put('/auth/me/password', { currentPassword, newPassword });
    return response.data;
  }

  // Users (Admin)
  async getUsers(params?: { page?: number; pageSize?: number; search?: string; role?: string; isActive?: boolean }) {
    const response = await this.client.get('/auth/users', { params });
    return response.data;
  }

  async createUser(data: { email: string; password: string; fullName: string; role: string }) {
    const response = await this.client.post('/auth/users', data);
    return response.data;
  }

  async updateUser(id: string, data: Partial<User>) {
    const response = await this.client.put(`/auth/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: string) {
    const response = await this.client.delete(`/auth/users/${id}`);
    return response.data;
  }

  // Products
  async getProducts(params?: { page?: number; pageSize?: number; search?: string; categoryId?: string; isActive?: boolean; lowStock?: boolean }) {
    const response = await this.client.get('/products', { params });
    return response.data;
  }

  async getProduct(id: string) {
    const response = await this.client.get(`/products/${id}`);
    return response.data;
  }

  async getProductByCode(code: string) {
    const response = await this.client.get(`/products/search/${code}`);
    return response.data;
  }

  async createProduct(data: any) {
    const response = await this.client.post('/products', data);
    return response.data;
  }

  async updateProduct(id: string, data: any) {
    const response = await this.client.put(`/products/${id}`, data);
    return response.data;
  }

  async deleteProduct(id: string) {
    const response = await this.client.delete(`/products/${id}`);
    return response.data;
  }

  async adjustStock(productId: string, quantity: number, reason: string, reference?: string) {
    const response = await this.client.post(`/products/${productId}/adjust`, { quantity, reason, reference });
    return response.data;
  }

  async getCategories() {
    const response = await this.client.get('/products/categories');
    return response.data;
  }

  async createCategory(data: { name: string; description?: string; parentId?: string }) {
    const response = await this.client.post('/products/categories', data);
    return response.data;
  }

  async getLowStock() {
    const response = await this.client.get('/products/low-stock');
    return response.data;
  }

  // Sales
  async getSales(params?: { page?: number; pageSize?: number; search?: string; status?: string; operatorId?: string; clientId?: string; dateFrom?: string; dateTo?: string }) {
    const response = await this.client.get('/sales', { params });
    return response.data;
  }

  async getSale(id: string) {
    const response = await this.client.get(`/sales/${id}`);
    return response.data;
  }

  async createSale(data: any) {
    const response = await this.client.post('/sales', data);
    return response.data;
  }

  async cancelSale(id: string, reason: string) {
    const response = await this.client.post(`/sales/${id}/cancel`, { reason });
    return response.data;
  }

  async getTodaysStats() {
    const response = await this.client.get('/sales/stats');
    return response.data;
  }

  // Purchases
  async getPurchases(params?: { page?: number; pageSize?: number; search?: string; status?: string; supplierId?: string; operatorId?: string; dateFrom?: string; dateTo?: string }) {
    const response = await this.client.get('/purchases', { params });
    return response.data;
  }

  async getPurchase(id: string) {
    const response = await this.client.get(`/purchases/${id}`);
    return response.data;
  }

  async createPurchase(data: any) {
    const response = await this.client.post('/purchases', data);
    return response.data;
  }

  async receivePurchase(id: string, items: { itemId: string; quantityReceived: number }[]) {
    const response = await this.client.post(`/purchases/${id}/receive`, { items });
    return response.data;
  }

  async getSuppliers() {
    const response = await this.client.get('/purchases/suppliers');
    return response.data;
  }

  async createSupplier(data: any) {
    const response = await this.client.post('/purchases/suppliers', data);
    return response.data;
  }

  // Clients
  async getClients(params?: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) {
    const response = await this.client.get('/clients', { params });
    return response.data;
  }

  async getClient(id: string) {
    const response = await this.client.get(`/clients/${id}`);
    return response.data;
  }

  async getClientBalance(id: string) {
    const response = await this.client.get(`/clients/${id}/balance`);
    return response.data;
  }

  async createClient(data: any) {
    const response = await this.client.post('/clients', data);
    return response.data;
  }

  async updateClient(id: string, data: any) {
    const response = await this.client.put(`/clients/${id}`, data);
    return response.data;
  }

  async toggleClientStatus(id: string) {
    const response = await this.client.put(`/clients/${id}/toggle`);
    return response.data;
  }

  async makeClientPayment(id: string, amount: number, method: string, reference: string) {
    const response = await this.client.post(`/clients/${id}/payment`, { amount, method, reference });
    return response.data;
  }

  // Voice
  async processVoiceCommand(parsedCommand: any, confirm?: boolean) {
    const response = await this.client.post('/voice/command', { parsedCommand, confirm });
    return response.data;
  }

  async parseVoiceText(text: string) {
    const response = await this.client.post('/voice/text', { text });
    return response.data;
  }

  async getVoiceHelp() {
    const response = await this.client.get('/voice/help');
    return response.data;
  }

  // Reports
  async getDashboardStats() {
    const response = await this.client.get('/reports/dashboard');
    return response.data;
  }

  async getSalesReport(params: { from: string; to: string; operatorId?: string; clientId?: string; paymentMethod?: string }) {
    const response = await this.client.get('/reports/sales', { params });
    return response.data;
  }

  async getPurchasesReport(params: { from: string; to: string; supplierId?: string }) {
    const response = await this.client.get('/reports/purchases', { params });
    return response.data;
  }

  async getTopProductsReport(params: { from: string; to: string; limit?: number }) {
    const response = await this.client.get('/reports/top-products', { params });
    return response.data;
  }

  async getLowStockReport() {
    const response = await this.client.get('/reports/low-stock');
    return response.data;
  }

  async getCashFlowReport(params: { from: string; to: string }) {
    const response = await this.client.get('/reports/cash-flow', { params });
    return response.data;
  }

  async getKardex(productId: string, params?: { from?: string; to?: string }) {
    const response = await this.client.get(`/reports/kardex/${productId}`, { params });
    return response.data;
  }

  async exportSalesCsv(params: { from: string; to: string }) {
    const response = await this.client.get('/reports/export/sales', { params, responseType: 'text' });
    return response.data;
  }

  async getSystemConfig() {
    const response = await this.client.get('/system/config');
    return response.data;
  }

  async updateSupplier(id: string, data: any) {
    const response = await this.client.put(`/purchases/suppliers/${id}`, data);
    return response.data;
  }
}

export const api = new ApiClient();

// Types for API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  warnings?: string[];
}

export interface PaginatedApiResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}