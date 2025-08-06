const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIClassificationService {
  constructor() {
    // Initialize Gemini AI (fallback to demo mode if no API key)
    this.isEnabled = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'demo_key_replace_with_actual';
    
    if (this.isEnabled) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    }
    
    // Define classification mappings
    this.categories = [
      'Road and Infrastructure',
      'Water Supply',
      'Electricity',
      'Sanitation and Waste Management',
      'Traffic and Transportation',
      'Public Safety',
      'Health Services',
      'Education',
      'Parks and Recreation',
      'Revenue and Tax',
      'Municipal Services',
      'Other'
    ];
    
    this.departments = [
      'PWD',
      'Water Works',
      'Electricity',
      'Sanitation',
      'Traffic Police',
      'Municipal Corporation',
      'Health Department',
      'Education',
      'Fire Department',
      'Parks and Gardens',
      'Revenue Department',
      'IT Department',
      'Other'
    ];
    
    this.priorities = ['low', 'medium', 'high', 'critical'];
    
    // Category to Department mapping
    this.categoryToDepartment = {
      'Road and Infrastructure': 'PWD',
      'Water Supply': 'Water Works',
      'Electricity': 'Electricity',
      'Sanitation and Waste Management': 'Sanitation',
      'Traffic and Transportation': 'Traffic Police',
      'Public Safety': 'Municipal Corporation',
      'Health Services': 'Health Department',
      'Education': 'Education',
      'Parks and Recreation': 'Parks and Gardens',
      'Revenue and Tax': 'Revenue Department',
      'Municipal Services': 'Municipal Corporation',
      'Other': 'Other'
    };
    
    // Keywords for fallback classification
    this.keywordMapping = {
      'road': { category: 'Road and Infrastructure', priority: 'medium' },
      'pothole': { category: 'Road and Infrastructure', priority: 'high' },
      'water': { category: 'Water Supply', priority: 'high' },
      'leak': { category: 'Water Supply', priority: 'high' },
      'electricity': { category: 'Electricity', priority: 'high' },
      'power': { category: 'Electricity', priority: 'high' },
      'garbage': { category: 'Sanitation and Waste Management', priority: 'medium' },
      'waste': { category: 'Sanitation and Waste Management', priority: 'medium' },
      'traffic': { category: 'Traffic and Transportation', priority: 'medium' },
      'signal': { category: 'Traffic and Transportation', priority: 'medium' },
      'fire': { category: 'Public Safety', priority: 'critical' },
      'emergency': { category: 'Public Safety', priority: 'critical' },
      'hospital': { category: 'Health Services', priority: 'high' },
      'medical': { category: 'Health Services', priority: 'high' },
      'school': { category: 'Education', priority: 'medium' },
      'park': { category: 'Parks and Recreation', priority: 'low' },
      'tax': { category: 'Revenue and Tax', priority: 'low' },
      'property': { category: 'Revenue and Tax', priority: 'low' }
    };
  }
  
  /**
   * Classify complaint using AI or fallback to keyword-based classification
   * @param {string} title - Complaint title
   * @param {string} description - Complaint description
   * @returns {Promise<Object>} Classification result
   */
  async classifyComplaint(title, description) {
    try {
      if (this.isEnabled) {
        return await this.aiClassification(title, description);
      } else {
        console.log('🤖 Using fallback classification (AI disabled)');
        return this.fallbackClassification(title, description);
      }
    } catch (error) {
      console.error('❌ AI Classification error:', error);
      console.log('🔄 Falling back to keyword-based classification');
      return this.fallbackClassification(title, description);
    }
  }
  
  /**
   * AI-powered classification using Gemini
   * @param {string} title - Complaint title
   * @param {string} description - Complaint description
   * @returns {Promise<Object>} AI classification result
   */
  async aiClassification(title, description) {
    const prompt = `
    You are an AI system for the Indore Smart City grievance management platform. 
    Analyze the following complaint and classify it into the appropriate category, department, and priority level.
    
    Complaint Title: "${title}"
    Complaint Description: "${description}"
    
    Available Categories:
    ${this.categories.join(', ')}
    
    Available Departments:
    ${this.departments.join(', ')}
    
    Priority Levels: critical, high, medium, low
    
    Priority Guidelines:
    - critical: Life-threatening emergencies, major infrastructure failures
    - high: Urgent issues affecting daily life, utility disruptions
    - medium: Important but not urgent issues
    - low: Minor issues, suggestions, general inquiries
    
    Please respond in the following JSON format only:
    {
      "category": "selected_category",
      "department": "selected_department", 
      "priority": "selected_priority",
      "confidence": 0.95,
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "reasoning": "Brief explanation of classification"
    }
    
    Ensure the response is valid JSON and confidence is between 0 and 1.
    `;
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }
      
      const aiResult = JSON.parse(jsonMatch[0]);
      
      // Validate the response
      if (!this.categories.includes(aiResult.category)) {
        aiResult.category = 'Other';
      }
      
      if (!this.departments.includes(aiResult.department)) {
        aiResult.department = this.categoryToDepartment[aiResult.category] || 'Other';
      }
      
      if (!this.priorities.includes(aiResult.priority)) {
        aiResult.priority = 'medium';
      }
      
      // Ensure confidence is valid
      if (typeof aiResult.confidence !== 'number' || aiResult.confidence < 0 || aiResult.confidence > 1) {
        aiResult.confidence = 0.8;
      }
      
      // Ensure keywords is an array
      if (!Array.isArray(aiResult.keywords)) {
        aiResult.keywords = this.extractKeywords(title, description);
      }
      
      console.log('🤖 AI Classification successful:', {
        category: aiResult.category,
        department: aiResult.department,
        priority: aiResult.priority,
        confidence: aiResult.confidence
      });
      
      return {
        category: aiResult.category,
        department: aiResult.department,
        priority: aiResult.priority,
        confidence: aiResult.confidence,
        keywords: aiResult.keywords.slice(0, 10), // Limit to 10 keywords
        processedAt: new Date()
      };
      
    } catch (error) {
      console.error('❌ AI processing error:', error);
      throw error;
    }
  }
  
  /**
   * Fallback keyword-based classification
   * @param {string} title - Complaint title
   * @param {string} description - Complaint description
   * @returns {Object} Classification result
   */
  fallbackClassification(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const words = text.split(/\s+/);
    
    let bestMatch = {
      category: 'Other',
      priority: 'medium',
      confidence: 0.3
    };
    
    // Find best keyword match
    for (const [keyword, classification] of Object.entries(this.keywordMapping)) {
      if (text.includes(keyword)) {
        bestMatch = {
          category: classification.category,
          priority: classification.priority,
          confidence: 0.7
        };
        break;
      }
    }
    
    // Determine department based on category
    const department = this.categoryToDepartment[bestMatch.category] || 'Other';
    
    // Extract keywords
    const keywords = this.extractKeywords(title, description);
    
    console.log('🔄 Fallback classification:', {
      category: bestMatch.category,
      department,
      priority: bestMatch.priority,
      confidence: bestMatch.confidence
    });
    
    return {
      category: bestMatch.category,
      department,
      priority: bestMatch.priority,
      confidence: bestMatch.confidence,
      keywords,
      processedAt: new Date()
    };
  }
  
  /**
   * Extract keywords from text
   * @param {string} title - Complaint title
   * @param {string} description - Complaint description
   * @returns {Array} Array of keywords
   */
  extractKeywords(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const words = text.split(/\s+/);
    
    // Common stop words to filter out
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ]);
    
    // Extract meaningful words (length > 3, not stop words)
    const keywords = words
      .filter(word => word.length > 3 && !stopWords.has(word))
      .filter((word, index, arr) => arr.indexOf(word) === index) // Remove duplicates
      .slice(0, 8); // Limit to 8 keywords
    
    return keywords;
  }
  
  /**
   * Get classification statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      isAIEnabled: this.isEnabled,
      availableCategories: this.categories.length,
      availableDepartments: this.departments.length,
      availablePriorities: this.priorities.length
    };
  }
}

// Export singleton instance
module.exports = new AIClassificationService();