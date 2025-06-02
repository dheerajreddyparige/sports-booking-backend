// Validate WhatsApp Flow Configuration
const whatsappFlow = require('./src/config/whatsappFlow');
console.log('Loading WhatsApp Flow configuration...');

// Check SUMMARY screen
const summaryScreen = whatsappFlow.screens.find(s => s.id === 'SUMMARY');
if (!summaryScreen) {
  console.error('❌ SUMMARY screen not found!');
  process.exit(1);
}

console.log('✅ SUMMARY screen found');

// Check the apply coupon button
const couponButton = summaryScreen.layout.children[4];
console.log('\nApply Coupon Button:');
console.log('Type:', couponButton.type);
console.log('Name:', couponButton.name);
console.log('Label:', couponButton.label);
console.log('Has on-click-action:', !!couponButton['on-click-action']);

if (couponButton.type !== 'Button') {
  console.error('❌ Apply coupon component should be a Button!');
  process.exit(1);
}

if (!couponButton.label) {
  console.error('❌ Button is missing required label property!');
  process.exit(1);
}

if (!couponButton['on-click-action']) {
  console.error('❌ Button is missing required on-click-action property!');
  process.exit(1);
}

console.log('\n✅ Apply coupon button configuration is valid');

// Validate all screens in the flow
console.log('\nValidating all screens in the flow:');
for (const screen of whatsappFlow.screens) {
  console.log(`\nScreen: ${screen.id}`);
  
  // Check if screen has required properties
  if (!screen.id || !screen.layout) {
    console.error(`❌ Screen ${screen.id} is missing required properties!`);
    process.exit(1);
  }
  
  // Validate all components in the screen
  for (const component of screen.layout.children) {
    // Check if component has required type
    if (!component.type) {
      console.error(`❌ Component in screen ${screen.id} is missing type!`);
      process.exit(1);
    }
    
    // Validate specific component types
    if (component.type === 'ChipsSelector' && !component.label) {
      console.error(`❌ ChipsSelector in screen ${screen.id} is missing required label property!`);
      process.exit(1);
    }
    
    if (component.type === 'Button' && !component.label) {
      console.error(`❌ Button in screen ${screen.id} is missing required label property!`);
      process.exit(1);
    }
    
    if (component.type === 'Button' && !component['on-click-action']) {
      console.error(`❌ Button in screen ${screen.id} is missing required on-click-action property!`);
      process.exit(1);
    }
  }
  
  console.log(`✅ Screen ${screen.id} is valid`);
}

console.log('\n✅ WhatsApp Flow configuration is valid!'); 