// Validate WhatsApp Flow Configuration
const whatsappFlow = require('./src/config/whatsappFlow');
console.log('Loading WhatsApp Flow configuration...');

// Check if whatsappFlow is loaded correctly
console.log('WhatsApp Flow loaded with', whatsappFlow.screens.length, 'screens');

// Check SUMMARY screen
const summaryScreen = whatsappFlow.screens.find(s => s.id === 'SUMMARY');
if (!summaryScreen) {
  console.error('❌ SUMMARY screen not found!');
  process.exit(1);
}

console.log('✅ SUMMARY screen found');

// Validate all screens in the flow
console.log('\nValidating all screens in the flow:');
for (const screen of whatsappFlow.screens) {
  console.log(`\nScreen: ${screen.id}`);
  
  // Check if screen has required properties
  if (!screen.id || !screen.layout) {
    console.error(`❌ Screen ${screen.id} is missing required properties!`);
    process.exit(1);
  }
  
  // Count Footer components
  const footerCount = screen.layout.children.filter(c => c.type === 'Footer').length;
  console.log(`Found ${footerCount} Footer components in screen ${screen.id}`);
  if (footerCount > 1) {
    console.error(`❌ Screen ${screen.id} has ${footerCount} Footer components. Maximum allowed is 1.`);
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
    
    // Check DatePicker format
    if (component.type === 'DatePicker') {
      console.log(`Checking DatePicker in screen ${screen.id}`);
      console.log(`min-date: ${component['min-date']}`);
      console.log(`max-date: ${component['max-date']}`);
      
      // Check if min-date is using dynamic binding
      if (component['min-date'] && component['min-date'].includes('${data.')) {
        console.log(`✅ DatePicker in screen ${screen.id} is using dynamic min-date binding`);
      } else if (component['min-date'] && typeof component['min-date'] === 'string' && 
          !component['min-date'].match(/^\d{4}-\d{2}-\d{2}$/)) {
        console.error(`❌ DatePicker in screen ${screen.id} has invalid min-date format. Should be YYYY-MM-DD.`);
        process.exit(1);
      }
      
      // Check if max-date is using dynamic binding
      if (component['max-date'] && component['max-date'].includes('${data.')) {
        console.log(`✅ DatePicker in screen ${screen.id} is using dynamic max-date binding`);
      } else if (component['max-date'] && typeof component['max-date'] === 'string' && 
          !component['max-date'].match(/^\d{4}-\d{2}-\d{2}$/)) {
        console.error(`❌ DatePicker in screen ${screen.id} has invalid max-date format. Should be YYYY-MM-DD.`);
        process.exit(1);
      }
    }
  }
  
  console.log(`✅ Screen ${screen.id} is valid`);
}

console.log('\n✅ WhatsApp Flow configuration is valid!'); 