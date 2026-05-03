/**
 * Test OpenAI API Connection with Lars Configuration
 * This script tests the QuestionGenerator with the exact API key from lars folder
 */

// Import the QuestionGenerator
import { QuestionGenerator } from './src/services/porp/QuestionGenerator.js';

async function testOpenAIConnection() {
  console.log('🧪 Testing OpenAI API connection with Lars configuration...\n');
  
  // Create QuestionGenerator instance
  const generator = new QuestionGenerator();
  
  // Test the connection
  console.log('📡 Testing API connection...');
  const connectionTest = await generator.testConnection();
  
  if (connectionTest) {
    console.log('✅ OpenAI API connection successful!');
    console.log('🤖 API key is valid and working\n');
    
    // Test question generation with sample text
    console.log('📝 Testing question generation...');
    const sampleChapterText = `
      Chapter 1: The Beginning
      
      Sarah walked through the forest, her heart pounding with excitement. She had been waiting for this moment for months - the chance to finally explore the mysterious woods that bordered her small town. The trees towered above her, their leaves whispering secrets in the gentle breeze.
      
      As she ventured deeper into the forest, she noticed something peculiar. A small, glowing path appeared before her, illuminating the way forward. Sarah hesitated for a moment, wondering if this was some kind of trick. But her curiosity got the better of her, and she decided to follow the mysterious light.
      
      The path led her to a clearing where she found an ancient stone monument covered in strange symbols. As she approached the monument, the symbols began to glow brighter, and a voice echoed through the clearing: "Welcome, chosen one. We have been waiting for you."
      
      Sarah's eyes widened in disbelief. This was beyond anything she had ever imagined. The voice continued: "You have been selected to undertake a great quest, one that will determine the fate of both our worlds. Are you ready to accept this challenge?"
      
      With trembling hands, Sarah reached out to touch the monument. The moment her fingers made contact, visions flooded her mind - images of battles, magic, and a world unlike anything she had ever known.
    `;
    
    try {
      const questions = await generator.generateQuestions(sampleChapterText, 1, 'test-novel-123');
      
      console.log('✅ Question generation successful!');
      console.log('📋 Generated questions:');
      questions.forEach((q, index) => {
        console.log(`\n${index + 1}. ${q.question}`);
        q.options.forEach((option, optIndex) => {
          const marker = optIndex === q.correct_answer ? '✓' : ' ';
          console.log(`   ${marker} ${option}`);
        });
      });
      
    } catch (error) {
      console.error('❌ Question generation failed:', error.message);
    }
    
  } else {
    console.log('❌ OpenAI API connection failed');
    console.log('🔄 Using fallback questions instead\n');
    
    // Show fallback questions
    const fallbackQuestions = generator.getFallbackQuestions();
    console.log('📋 Fallback questions:');
    fallbackQuestions.forEach((q, index) => {
      console.log(`\n${index + 1}. ${q.question}`);
      q.options.forEach((option, optIndex) => {
        const marker = optIndex === q.correct_answer ? '✓' : ' ';
        console.log(`   ${marker} ${option}`);
      });
    });
  }
  
  console.log('\n🎯 Test completed!');
  console.log('📊 PoRP QuestionGenerator is ready for use.');
}

// Run the test
testOpenAIConnection().catch(console.error);
