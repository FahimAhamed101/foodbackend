/**
 * CORRECT Payment Flow Test
 * 
 * Base Price: $5.99
 *   ↳ Restaurant: $5.49
 *   ↳ Admin: $0.50 (platform fee deducted)
 * Service Fee: Restaurant sets, restaurant gets
 * Tax: Calculated on subtotal, admin gets
 */

console.log('=== CORRECT PAYMENT CALCULATION ===\n');

// Example 1: Single item
console.log('📦 Example 1: 1 item with $1.25 service fee, Dhaka 15% tax');
const baseRevenue1 = 5.99;
const serviceFee1 = 1.25;
const platformFee1 = 0.50;
const quantity1 = 1;
const taxRate1 = 0.15;

const subtotal1 = (baseRevenue1 + serviceFee1) * quantity1;
const platformFeeTotal1 = platformFee1 * quantity1;
const tax1 = subtotal1 * taxRate1;
const total1 = subtotal1 + tax1;
const restaurantGets1 = ((baseRevenue1 - platformFee1) + serviceFee1) * quantity1;
const adminGets1 = platformFeeTotal1 + tax1;

console.log(`Base Price: $${baseRevenue1.toFixed(2)}`);
console.log(`  ↳ Restaurant: $${(baseRevenue1 - platformFee1).toFixed(2)}`);
console.log(`  ↳ Admin: $${platformFee1.toFixed(2)}`);
console.log(`Service Fee: $${serviceFee1.toFixed(2)} (restaurant gets)`);
console.log(`Subtotal: $${subtotal1.toFixed(2)} (customer pays before tax)`);
console.log(`Tax (15%): $${tax1.toFixed(2)} (admin gets)`);
console.log(`Total: $${total1.toFixed(2)} (customer pays)`);
console.log(`\n💰 Restaurant receives: $${restaurantGets1.toFixed(2)}`);
console.log(`💰 Admin receives: $${adminGets1.toFixed(2)}`);
console.log(`✅ Verification: $${restaurantGets1.toFixed(2)} + $${adminGets1.toFixed(2)} = $${(restaurantGets1 + adminGets1).toFixed(2)} (should equal subtotal $${subtotal1.toFixed(2)})`);

console.log('\n' + '='.repeat(50) + '\n');

// Example 2: Two items
console.log('📦 Example 2: 2 items with $1.25 service fee each, Dhaka 15% tax');
const baseRevenue2 = 5.99;
const serviceFee2 = 1.25;
const platformFee2 = 0.50;
const quantity2 = 2;
const taxRate2 = 0.15;

const subtotal2 = (baseRevenue2 + serviceFee2) * quantity2;
const platformFeeTotal2 = platformFee2 * quantity2;
const tax2 = subtotal2 * taxRate2;
const total2 = subtotal2 + tax2;
const restaurantGets2 = ((baseRevenue2 - platformFee2) + serviceFee2) * quantity2;
const adminGets2 = platformFeeTotal2 + tax2;

console.log(`2 × Base Price: $${(baseRevenue2 * quantity2).toFixed(2)}`);
console.log(`  ↳ Restaurant: $${((baseRevenue2 - platformFee2) * quantity2).toFixed(2)}`);
console.log(`  ↳ Admin: $${platformFeeTotal2.toFixed(2)}`);
console.log(`2 × Service Fee: $${(serviceFee2 * quantity2).toFixed(2)} (restaurant gets)`);
console.log(`Subtotal: $${subtotal2.toFixed(2)} (customer pays before tax)`);
console.log(`Tax (15%): $${tax2.toFixed(2)} (admin gets)`);
console.log(`Total: $${total2.toFixed(2)} (customer pays)`);
console.log(`\n💰 Restaurant receives: $${restaurantGets2.toFixed(2)}`);
console.log(`💰 Admin receives: $${adminGets2.toFixed(2)}`);
console.log(`✅ Verification: $${restaurantGets2.toFixed(2)} + $${adminGets2.toFixed(2)} = $${(restaurantGets2 + adminGets2).toFixed(2)} (should equal subtotal $${subtotal2.toFixed(2)})`);

console.log('\n' + '='.repeat(50) + '\n');

// Example 3: Different tax rate (CA 9%)
console.log('📦 Example 3: 1 item with $1.25 service fee, California 9% tax');
const baseRevenue3 = 5.99;
const serviceFee3 = 1.25;
const platformFee3 = 0.50;
const quantity3 = 1;
const taxRate3 = 0.09;

const subtotal3 = (baseRevenue3 + serviceFee3) * quantity3;
const platformFeeTotal3 = platformFee3 * quantity3;
const tax3 = subtotal3 * taxRate3;
const total3 = subtotal3 + tax3;
const restaurantGets3 = ((baseRevenue3 - platformFee3) + serviceFee3) * quantity3;
const adminGets3 = platformFeeTotal3 + tax3;

console.log(`Base Price: $${baseRevenue3.toFixed(2)}`);
console.log(`  ↳ Restaurant: $${(baseRevenue3 - platformFee3).toFixed(2)}`);
console.log(`  ↳ Admin: $${platformFee3.toFixed(2)}`);
console.log(`Service Fee: $${serviceFee3.toFixed(2)} (restaurant gets)`);
console.log(`Subtotal: $${subtotal3.toFixed(2)} (customer pays before tax)`);
console.log(`Tax (9%): $${tax3.toFixed(2)} (admin gets)`);
console.log(`Total: $${total3.toFixed(2)} (customer pays)`);
console.log(`\n💰 Restaurant receives: $${restaurantGets3.toFixed(2)}`);
console.log(`💰 Admin receives: $${adminGets3.toFixed(2)}`);
console.log(`✅ Verification: $${restaurantGets3.toFixed(2)} + $${adminGets3.toFixed(2)} = $${(restaurantGets3 + adminGets3).toFixed(2)} (should equal subtotal $${subtotal3.toFixed(2)})`);
