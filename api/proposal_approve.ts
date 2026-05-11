import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_utils/firebase.js';
import { asaasRequest } from './_utils/asaas.js';
import { Timestamp } from 'firebase-admin/firestore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { proposalId, metadata, selectedItems } = req.body;

    if (!proposalId) return res.status(400).json({ error: 'ID da proposta é obrigatório' });

    // 1. Fetch Proposal
    const proposalRef = db.collection('proposals').doc(proposalId);
    const proposalSnap = await proposalRef.get();

    if (!proposalSnap.exists) {
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }

    const proposalData = proposalSnap.data();
    if (proposalData.status === 'approved') {
      return res.status(200).json({ 
        message: 'Proposta já aprovada', 
        checkoutUrl: proposalData.checkoutUrl 
      });
    }

    const orgId = proposalData.orgId;
    const leadId = proposalData.leadId;

    // 2. Fetch Lead
    const leadRef = db.collection('organizations').doc(orgId).collection('leads').doc(leadId);
    const leadSnap = await leadRef.get();
    
    if (!leadSnap.exists) {
      return res.status(404).json({ error: 'Lead não encontrado para conversão' });
    }
    const leadData = leadSnap.data();

    // 3. Process Items Selection
    const updatedItems = proposalData.items.map((item: any) => ({
      ...item,
      isSelected: selectedItems.includes(item.id) || !item.isOptional
    }));

    const totalAmount = updatedItems
      .filter((i: any) => i.isSelected)
      .reduce((acc: number, curr: any) => acc + (curr.price * (curr.quantity || 1)), 0);

    // 4. Create/Find Asaas Customer
    let asaasCustomer;
    const cleanCpfCnpj = leadData.cpfCnpj ? leadData.cpfCnpj.replace(/\D/g, '') : '';
    
    if (cleanCpfCnpj && (cleanCpfCnpj.length === 11 || cleanCpfCnpj.length === 14)) {
      const existing = await asaasRequest(`/customers?cpfCnpj=${cleanCpfCnpj}`, "GET");
      if (existing.data && existing.data.length > 0) {
        asaasCustomer = existing.data[0];
      }
    }

    if (!asaasCustomer) {
      asaasCustomer = await asaasRequest("/customers", "POST", {
        name: leadData.name,
        email: leadData.email,
        mobilePhone: leadData.whatsapp ? leadData.whatsapp.replace(/\D/g, '') : undefined,
        cpfCnpj: cleanCpfCnpj || undefined,
        observations: `Convertido via Proposta Web: ${proposalId}`
      });
    }

    // 5. Create Asaas Charge (Single Payment for now as default for proposals)
    const payment = await asaasRequest("/payments", "POST", {
      customer: asaasCustomer.id,
      billingType: "UNDEFINED",
      value: totalAmount,
      dueDate: new Date(Date.now() + 86400 * 3 * 1000).toISOString().split('T')[0], // 3 dias
      description: `Proposta Aprovada: ${proposalData.title}`,
      observations: `Referência Proposta: ${proposalId}`
    });

    const checkoutUrl = payment.invoiceUrl;

    // 6. Create Client in CRM
    const clientRef = db.collection('organizations').doc(orgId).collection('clients').doc(leadId);
    await clientRef.set({
      id: leadId,
      name: leadData.name,
      email: leadData.email,
      whatsapp: leadData.whatsapp,
      asaasCustomerId: asaasCustomer.id,
      status: 'Ativo',
      paymentStatus: 'PENDING',
      plan: proposalData.title,
      totalAmount,
      invoiceUrl: checkoutUrl,
      nextDueDate: payment.dueDate,
      createdAt: Date.now(),
      convertedVia: 'Web Proposal',
      proposalId: proposalId
    });

    // 7. Update Lead
    await leadRef.update({
      status: 'Convertido',
      convertedAt: Date.now(),
      conversionNotes: `Aprovou proposta ${proposalId} em ${new Date().toLocaleString()}`
    });

    // 8. Update Proposal
    await proposalRef.update({
      status: 'approved',
      approvedAt: Timestamp.now(),
      acceptanceMetadata: metadata || {},
      items: updatedItems,
      totalAmount,
      checkoutUrl: checkoutUrl
    });

    return res.status(200).json({ 
      success: true, 
      checkoutUrl,
      clientId: leadId 
    });

  } catch (error: any) {
    console.error('[ProposalApprove] Error:', error);
    return res.status(500).json({ error: error.message || 'Erro interno ao aprovar proposta' });
  }
}
