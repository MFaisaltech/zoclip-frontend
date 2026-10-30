import { pricingPackages } from './pricing-catalog'

export function whatsappPurchase(slug: string): string {
  const plan = pricingPackages.find(value => value.slug === slug)
  if (!plan) throw new Error('Select a current package')
  const text = `Hello ZoClip, I would like to buy ${plan.name}: PKR ${plan.pricePaisa / 100} for ${plan.credits.toLocaleString('en-US')} credits (50 credits per generated clip).\nPlease send verified bank/wallet payment details and payment instructions before I pay.\nMy registered ZoClip email: [enter email]\nI will attach the payment screenshot and transaction reference after payment. Please independently verify receipt before activating my package.`
  return `https://wa.me/923189753773?text=${encodeURIComponent(text)}`
}
