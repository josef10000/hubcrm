const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Update getSetupPrice and getPlanPrice definitions
content = content.replace(
  /export const getSetupPrice = \(plan\?: string\) => \{[\s\S]*?return 2500; \/\/ Essencial\n\};/,
  `export const getSetupPrice = (plan?: string, client?: Partial<Client>) => {
  if (client && client.setupPrice !== undefined) return client.setupPrice;
  if (plan === 'Profissional') return 7500;
  return 2500; // Essencial
};`
);

content = content.replace(
  /export const getPlanPrice = \(plan\?: string, billingCycle\?: string\) => \{[\s\S]*?return monthlyPrice;\n\};/,
  `export const getPlanPrice = (plan?: string, billingCycle?: string, client?: Partial<Client>) => {
  if (client && client.planPrice !== undefined) {
    if (billingCycle === 'YEARLY' && client.setupPrice !== undefined) {
      return client.setupPrice + (client.planPrice * 9);
    }
    return client.planPrice;
  }
  const monthlyPrice = plan === 'Profissional' ? 897 : 397;
  
  if (billingCycle === 'YEARLY') {
    const setupPrice = getSetupPrice(plan, client);
    return setupPrice + (monthlyPrice * 9);
  }
  
  return monthlyPrice;
};`
);

// Replace calls
content = content.replace(/getPlanPrice\(client\.plan, client\.billingCycle\)/g, 'getPlanPrice(client.plan, client.billingCycle, client)');
content = content.replace(/getPlanPrice\(c\.plan, c\.billingCycle\)/g, 'getPlanPrice(c.plan, c.billingCycle, c)');
content = content.replace(/getPlanPrice\(a\.plan, a\.billingCycle\)/g, 'getPlanPrice(a.plan, a.billingCycle, a)');
content = content.replace(/getPlanPrice\(b\.plan, b\.billingCycle\)/g, 'getPlanPrice(b.plan, b.billingCycle, b)');
content = content.replace(/getPlanPrice\(referrer\.plan, referrer\.billingCycle\)/g, 'getPlanPrice(referrer.plan, referrer.billingCycle, referrer)');
content = content.replace(/getPlanPrice\(formData\.plan, 'YEARLY'\)/g, "getPlanPrice(formData.plan, 'YEARLY', formData)");
content = content.replace(/getPlanPrice\('Essencial', formData\.billingCycle\)/g, "getPlanPrice('Essencial', formData.billingCycle)");
content = content.replace(/getPlanPrice\('Profissional', formData\.billingCycle\)/g, "getPlanPrice('Profissional', formData.billingCycle)");

content = content.replace(/getSetupPrice\(client\.plan\)/g, 'getSetupPrice(client.plan, client)');

fs.writeFileSync('src/App.tsx', content);
console.log('Done');
