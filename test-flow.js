// Simple test script to validate the WhatsApp Flow configuration
try {
  const whatsappFlow = require('./src/config/whatsappFlow');
  console.log('WhatsApp Flow loaded successfully');
  console.log('Number of screens:', whatsappFlow.screens.length);
  
  // Check for multiple Footer components in SUCCESS screen
  const successScreen = whatsappFlow.screens.find(s => s.id === 'SUCCESS');
  if (successScreen) {
    const footerCount = successScreen.layout.children.filter(c => c.type === 'Footer').length;
    console.log('Number of Footer components in SUCCESS screen:', footerCount);
    
    if (footerCount > 1) {
      console.error('ERROR: SUCCESS screen has multiple Footer components');
    } else {
      console.log('SUCCESS screen Footer count is valid');
    }
  }
  
  // Check DatePicker format in BOOKING screen
  const bookingScreen = whatsappFlow.screens.find(s => s.id === 'BOOKING');
  if (bookingScreen) {
    const datePicker = bookingScreen.layout.children.find(c => c.type === 'DatePicker');
    if (datePicker) {
      console.log('DatePicker min-date:', datePicker['min-date']);
      console.log('DatePicker max-date:', datePicker['max-date']);
      
      // Check if min-date and max-date are using dynamic binding
      if (datePicker['min-date'] && datePicker['min-date'].includes('${data.')) {
        console.log('✅ min-date is using dynamic binding');
      } else {
        // Check if min-date is in the correct format
        const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (datePicker['min-date'] && !dateFormatRegex.test(datePicker['min-date'])) {
          console.error('ERROR: min-date format is invalid. Should be YYYY-MM-DD');
        }
      }
      
      if (datePicker['max-date'] && datePicker['max-date'].includes('${data.')) {
        console.log('✅ max-date is using dynamic binding');
      } else {
        // Check if max-date is in the correct format
        const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (datePicker['max-date'] && !dateFormatRegex.test(datePicker['max-date'])) {
          console.error('ERROR: max-date format is invalid. Should be YYYY-MM-DD');
        }
      }
    }
  }
  
  // Check if the summary screen has the correct format
  const summaryScreen = whatsappFlow.screens.find(s => s.id === 'SUMMARY');
  if (summaryScreen) {
    const bookingDetails = summaryScreen.layout.children.find(c => 
      c.type === 'TextBody' && c.text && c.text.includes('${data.sport}'));
    
    if (bookingDetails) {
      console.log('✅ Summary screen has formatted booking details');
    } else {
      console.error('ERROR: Summary screen is missing formatted booking details');
    }
  }
} catch (error) {
  console.error('Error loading WhatsApp Flow:', error);
} 