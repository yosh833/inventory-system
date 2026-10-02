import { VoiceCommandParsed, PaymentMethod } from '../types';

export class VoiceService {
  private intentPatterns = {
    CREATE_SALE: [
      /vender\s+(\d+)\s+(.+?)\s+(?:a|para)\s+(.+)/i,
      /venta\s+de\s+(\d+)\s+(.+?)\s+(?:a|para)\s+(.+)/i,
      /registrar\s+salida\s+(\d+)\s+(.+)/i,
      /facturar\s+(\d+)\s+(.+?)\s+(?:a|para)\s+(.+)/i,
      /cobrar\s+(\d+)\s+(.+?)\s+(?:a|para)\s+(.+)/i
    ],
    CREATE_PURCHASE: [
      /comprar\s+(\d+)\s+(.+?)\s+(?:al|a|del|de)\s+(.+)/i,
      /orden\s+de\s+compra\s+(\d+)\s+(.+?)\s+(?:al|a|del|de)\s+(.+)/i,
      /pedir\s+(\d+)\s+(.+?)\s+(?:al|a|del|de)\s+(.+)/i,
      /solicitar\s+(\d+)\s+(.+?)\s+(?:al|a|del|de)\s+(.+)/i
    ],
    CHECK_STOCK: [
      /cu[aá]nto\s+hay\s+de\s+(.+)/i,
      /existencia\s+de\s+(.+)/i,
      /stock\s+(?:actual\s+)?(?:de\s+)?(.+)/i,
      /disponible\s+(.+)/i
    ],
    ADJUST_STOCK: [
      /ajustar\s+(más|menos)\s+(\d+)\s+(.+?)\s+por\s+(.+)/i,
      /agregar\s+(\d+)\s+(.+?)\s+al\s+inventario/i,
      /quitar\s+(\d+)\s+(.+?)\s+del\s+inventario/i
    ],
    GET_REPORT: [
      /reporte\s+de\s+ventas/i,
      /reporte\s+de\s+compras/i,
      /productos\s+m[aá]s\s+vendidos/i,
      /stock\s+crítico/i,
      /flujo\s+de\s+caja/i,
      /balance\s+de\s+ingresos\s+y\s+egresos/i
    ],
    SEARCH_PRODUCT: [
      /buscar\s+(.+)/i,
      /encontrar\s+(.+)/i,
      /dónde\s+está\s+(.+)/i
    ]
  };

  private paymentMethodKeywords: Record<PaymentMethod, string[]> = {
    CASH: ['efectivo', 'cash', 'contado'],
    CARD: ['tarjeta', 'card', 'crédito', 'débito'],
    TRANSFER: ['transferencia', 'transfer', 'spei'],
    CREDIT: ['crédito', 'fiado', 'cuenta'],
    MIXED: ['mixto', 'mix']
  };

  parseCommand(text: string): VoiceCommandParsed {
    const normalized = text.trim().toLowerCase();
    
    // Try each intent
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (match) {
          return this.extractEntities(intent as VoiceCommandParsed['intent'], match, text);
        }
      }
    }

    // Default: search product
    return {
      intent: 'SEARCH_PRODUCT',
      entities: { query: text },
      confidence: 0.3,
      rawText: text,
      requiresConfirmation: false
    };
  }

  private extractEntities(intent: VoiceCommandParsed['intent'], match: RegExpMatchArray, rawText: string): VoiceCommandParsed {
    const entities: VoiceCommandParsed['entities'] = {};
    let confidence = 0.85;
    let requiresConfirmation = true;

    switch (intent) {
      case 'CREATE_SALE':
        // match[1] = quantity, match[2] = product, match[3] = client (optional)
        entities.quantity = parseInt(match[1]) || 1;
        entities.product = match[2]?.trim();
        if (match[3]) entities.client = match[3].trim();
        // Check for price/discount/payment method in raw text
        this.extractSaleExtras(rawText, entities);
        break;

      case 'CREATE_PURCHASE':
        entities.quantity = parseInt(match[1]) || 1;
        entities.product = match[2]?.trim();
        entities.supplier = match[3]?.trim();
        this.extractPurchaseExtras(rawText, entities);
        break;

      case 'CHECK_STOCK':
        entities.product = match[1]?.trim();
        requiresConfirmation = false;
        confidence = 0.9;
        break;

      case 'ADJUST_STOCK':
        const direction = match[1]?.toLowerCase();
        entities.quantity = (direction === 'menos' ? -1 : 1) * (parseInt(match[2]) || 1);
        entities.product = match[3]?.trim();
        entities.reason = match[4]?.trim() || 'Ajuste por voz';
        break;

      case 'GET_REPORT':
        entities.reportType = this.detectReportType(rawText);
        entities.dateRange = this.extractDateRange(rawText);
        requiresConfirmation = false;
        confidence = 0.9;
        break;

      case 'SEARCH_PRODUCT':
        entities.query = match[1]?.trim() || rawText;
        requiresConfirmation = false;
        confidence = 0.7;
        break;
    }

    return { intent, entities, confidence, rawText, requiresConfirmation };
  }

  private extractSaleExtras(text: string, entities: VoiceCommandParsed['entities']) {
    // Price: "a 150 pesos", "precio 200"
    const priceMatch = text.match(/(?:a|precio)\s+(\d+(?:\.\d+)?)\s*(?:pesos|mxn)?/i);
    if (priceMatch) entities.price = parseFloat(priceMatch[1]);

    // Discount: "con 10 por ciento descuento", "descuento 15%"
    const discMatch = text.match(/(?:con\s+)?(\d+)\s*(?:por\s*ciento|%)\s*descuento/i);
    if (discMatch) entities.discount = parseInt(discMatch[1]);

    // Payment method
    for (const [method, keywords] of Object.entries(this.paymentMethodKeywords)) {
      if (keywords.some(k => text.toLowerCase().includes(k))) {
        entities.paymentMethod = method as PaymentMethod;
        break;
      }
    }
  }

  private extractPurchaseExtras(text: string, entities: VoiceCommandParsed['entities']) {
    // Cost: "a 180 unitario", "precio 200"
    const costMatch = text.match(/(?:a|precio|costo)\s+(\d+(?:\.\d+)?)\s*(?:unitario|pesos|mxn)?/i);
    if (costMatch) entities.cost = parseFloat(costMatch[1]);

    // Expected date: "para el martes", "para mañana"
    const dateMatch = text.match(/para\s+(?:el\s+)?(mañana|pasado\s+mañana|lunes|martes|miércoles|jueves|viernes|sábado|domingo)/i);
    if (dateMatch) {
      entities.expectedDate = this.parseRelativeDate(dateMatch[1]);
    }
  }

  private detectReportType(text: string): VoiceCommandParsed['entities']['reportType'] {
    const t = text.toLowerCase();
    if (t.includes('venta')) return 'SALES';
    if (t.includes('compra')) return 'PURCHASES';
    if (t.includes('vendido') || t.includes('top')) return 'TOP_PRODUCTS';
    if (t.includes('crítico') || t.includes('bajo')) return 'LOW_STOCK';
    if (t.includes('flujo') || t.includes('caja') || t.includes('balance')) return 'CASH_FLOW';
    return 'SALES';
  }

  private extractDateRange(text: string): VoiceCommandParsed['entities']['dateRange'] {
    const t = text.toLowerCase();
    const now = new Date();
    let from: Date, to: Date = new Date();

    if (t.includes('hoy')) {
      from = new Date(now);
      from.setHours(0, 0, 0, 0);
    } else if (t.includes('ayer')) {
      from = new Date(now);
      from.setDate(from.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to = new Date(from);
      to.setHours(23, 59, 59, 999);
    } else if (t.includes('esta semana') || t.includes('semana actual')) {
      from = new Date(now);
      from.setDate(now.getDate() - now.getDay());
      from.setHours(0, 0, 0, 0);
    } else if (t.includes('semana pasada')) {
      from = new Date(now);
      from.setDate(now.getDate() - now.getDay() - 7);
      from.setHours(0, 0, 0, 0);
      to = new Date(from);
      to.setDate(to.getDate() + 6);
      to.setHours(23, 59, 59, 999);
    } else if (t.includes('este mes')) {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (t.includes('mes pasado')) {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0);
      to.setHours(23, 59, 59, 999);
    } else {
      // Default: last 30 days
      from = new Date(now);
      from.setDate(now.getDate() - 30);
    }

    return { from, to };
  }

  private parseRelativeDate(text: string): Date {
    const t = text.toLowerCase();
    const now = new Date();
    const result = new Date(now);
    result.setHours(0, 0, 0, 0);

    if (t === 'mañana') result.setDate(now.getDate() + 1);
    else if (t === 'pasado mañana') result.setDate(now.getDate() + 2);
    else {
      const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const targetDay = days.indexOf(t);
      if (targetDay >= 0) {
        let diff = targetDay - now.getDay();
        if (diff <= 0) diff += 7;
        result.setDate(now.getDate() + diff);
      }
    }
    return result;
  }

  // Simulated STT - in production would call Whisper/Vosk
  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    // Mock implementation - returns a test command
    // In production: call Whisper.cpp, OpenAI Whisper API, or Vosk
    return 'vender 3 tornillos M8 a cliente Juan Pérez';
  }

  // Generate confirmation message for TTS
  generateConfirmationMessage(parsed: VoiceCommandParsed): string {
    const { intent, entities } = parsed;
    
    switch (intent) {
      case 'CREATE_SALE':
        return `Confirmar venta: ${entities.quantity} ${entities.product}${entities.client ? ` a ${entities.client}` : ''}${entities.price ? ` a $${entities.price} c/u` : ''}`;
      case 'CREATE_PURCHASE':
        return `Confirmar compra: ${entities.quantity} ${entities.product}${entities.supplier ? ` al proveedor ${entities.supplier}` : ''}${entities.cost ? ` a $${entities.cost} c/u` : ''}`;
      case 'ADJUST_STOCK':
        return `Confirmar ajuste: ${entities.quantity > 0 ? 'agregar' : 'quitar'} ${Math.abs(entities.quantity!)} ${entities.product} por "${entities.reason}"`;
      default:
        return `Confirmar acción: ${intent}`;
    }
  }
}