import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * AI Classification Service for complaint routing and categorization
 * Uses Google Gemini AI with fallback to keyword-based classification
 */
export class AIClassificationService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.isAIEnabled = false;
    
    this.initializeAI();
    
    // Define classification categories
    this.categories = [
      'Road and Infrastructure',
      'Water Supply',
      'Electricity',
      'Sanitation',
      'Traffic and Transportation',
      'Health and Safety',
      'Education',
      'Fire Safety',
      'Revenue and Tax',
      'Urban Planning',
      'Environment',
      'Street Lighting',
      'Other'
    ];
    
    // Define departments
    this.departments = [
      'PWD',
      'Water Works',
      'Electricity',
      'Sanitation',
      'Traffic Police',
      'Health Department',
      'Education',
      'Fire Department',
      'Revenue',
      'Town Planning',
      'Horticulture',
      'Street Lighting'
    ];
    
    // Define priorities
    this.priorities = ['low', 'medium', 'high', 'critical'];
    
    // Category to department mapping
    this.categoryDepartmentMap = {
      'Road and Infrastructure': 'PWD',
      'Water Supply': 'Water Works',
      'Electricity': 'Electricity',
      'Sanitation': 'Sanitation',
      'Traffic and Transportation': 'Traffic Police',
      'Health and Safety': 'Health Department',
      'Education': 'Education',
      'Fire Safety': 'Fire Department',
      'Revenue and Tax': 'Revenue',
      'Urban Planning': 'Town Planning',
      'Environment': 'Horticulture',
      'Street Lighting': 'Street Lighting',
      'Other': 'PWD'
    };
    
    // Keyword patterns for fallback classification
    this.keywordPatterns = {
      'Road and Infrastructure': [
        'road', 'street', 'pothole', 'bridge', 'footpath', 'sidewalk',
        'construction', 'repair', 'maintenance', 'infrastructure', 'pathway',
        'highway', 'flyover', 'underpass', 'divider', 'median'
      ],
      'Water Supply': [
        'water', 'tap', 'pipeline', 'leakage', 'supply', 'shortage',
        'quality', 'contamination', 'pressure', 'connection', 'meter',
        'billing', 'sewage', 'drainage', 'overflow'
      ],
      'Electricity': [
        'electricity', 'power', 'outage', 'blackout', 'transformer',
        'pole', 'wire', 'cable', 'meter', 'billing', 'connection',
        'voltage', 'supply', 'cut', 'fault', 'short circuit'
      ],
      'Sanitation': [
        'garbage', 'waste', 'cleaning', 'sweeping', 'collection',
        'dustbin', 'toilet', 'public toilet', 'sanitation', 'hygiene',
        'disposal', 'litter', 'dump', 'bin', 'cleanliness'
      ],
      'Traffic and Transportation': [
        'traffic', 'signal', 'jam', 'congestion', 'parking', 'vehicle',
        'bus', 'auto', 'rickshaw', 'transport', 'violation', 'challan',
        'fine', 'license', 'permit', 'registration'
      ],
      'Health and Safety': [
        'health', 'hospital', 'medical', 'doctor', 'clinic', 'medicine',
        'safety', 'accident', 'emergency', 'ambulance', 'vaccination',
        'disease', 'epidemic', 'food safety', 'pollution'
      ],
      'Education': [
        'school', 'college', 'education', 'teacher', 'student', 'class',
        'admission', 'fee', 'scholarship', 'uniform', 'book', 'facility',
        'playground', 'library', 'computer'
      ],
      'Fire Safety': [
        'fire', 'emergency', 'safety', 'extinguisher', 'alarm', 'smoke',
        'rescue', 'evacuation', 'hazard', 'building safety', 'exit'
      ],
      'Revenue and Tax': [
        'tax', 'property', 'revenue', 'assessment', 'payment', 'receipt',
        'registration', 'document', 'certificate', 'license', 'permit',
        'fine', 'penalty', 'refund'
      ],
      'Urban Planning': [
        'planning', 'construction', 'building', 'approval', 'permit',
        'zoning', 'layout', 'development', 'land', 'property', 'map',
        'survey', 'boundary', 'encroachment'
      ],
      'Environment': [
        'environment', 'pollution', 'noise', 'air', 'tree', 'park',
        'garden', 'green', 'plantation', 'cutting', 'conservation',
        'waste', 'recycling', 'clean', 'nature'
      ],
      'Street Lighting': [
        'street light', 'lamp', 'lighting', 'bulb', 'pole', 'dark',
        'illumination', 'night', 'safety', 'visibility', 'repair',
        'installation', 'maintenance'
      ]
    };
    
    // Priority keywords
    this.priorityKeywords = {
      'critical': [
        'emergency', 'urgent', 'critical', 'danger', 'life threatening',
        'immediate', 'fire', 'accident', 'injury', 'death', 'collapse',
        'explosion', 'gas leak', 'electric shock', 'flood'
      ],
      'high': [
        'serious', 'major', 'important', 'significant', 'severe',
        'broken', 'damaged', 'not working', 'completely', 'total',
        'public safety', 'health risk', 'contaminated'
      ],
      'medium': [
        'problem', 'issue', 'concern', 'needs attention', 'repair',
        'maintenance', 'improvement', 'upgrade', 'replace'
      ],
      'low': [
        'minor', 'small', 'suggestion', 'request', 'enhancement',
        'cosmetic', 'aesthetic', 'convenience', 'when possible'
      ]
    };
  }
  
  /**
   * Initialize Google Generative AI
   */
  initializeAI() {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey === 'demo_key_replace_with_actual') {
        console.warn('⚠️  Gemini API key not configured. Using fallback classification.'.yellow);
        this.isAIEnabled = false;
        return;
      }
      
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      this.isAIEnabled = true;
      
      console.log('✅ Gemini AI initialized successfully'.green);
    } catch (error) {
      console.error('❌ Failed to initialize Gemini AI:', error.message);
      this.isAIEnabled = false;
    }
  }
  
  /**
   * Main classification method
   */
  async classifyComplaint(title, description, location = null) {
    try {
      console.log(`🤖 Classifying complaint: "${title.substring(0, 50)}..."`);
      
      let result;
      
      if (this.isAIEnabled) {
        try {
          result = await this.aiClassification(title, description, location);
          console.log(`✅ AI classification successful (confidence: ${result.confidence})`);
        } catch (aiError) {
          console.warn('⚠️  AI classification failed, using fallback:', aiError.message);
          result = this.fallbackClassification(title, description);
        }
      } else {
        result = this.fallbackClassification(title, description);
      }
      
      // Validate and sanitize result
      result = this.validateClassificationResult(result);
      
      console.log(`📊 Final classification:`, {
        category: result.category,
        department: result.department,
        priority: result.priority,
        confidence: result.confidence
      });
      
      return result;
    } catch (error) {
      console.error('❌ Classification failed:', error);
      
      // Return default classification
      return {
        category: 'Other',
        department: 'PWD',
        priority: 'medium',
        confidence: 0.1,
        keywords: [],
        model: 'fallback-default',
        processedAt: new Date()
      };
    }
  }
  
  /**
   * AI-based classification using Gemini
   */
  async aiClassification(title, description, location) {
    const prompt = this.buildClassificationPrompt(title, description, location);
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Parse JSON response
      const classification = JSON.parse(text);
      
      // Validate AI response
      if (!this.isValidClassification(classification)) {
        throw new Error('Invalid AI response format');
      }
      
      return {
        category: classification.category,
        department: classification.department,
        priority: classification.priority,
        confidence: Math.min(Math.max(classification.confidence || 0.8, 0), 1),
        keywords: classification.keywords || this.extractKeywords(title + ' ' + description),
        model: 'gemini-pro',
        processedAt: new Date()
      };
    } catch (error) {
      console.error('AI classification error:', error.message);
      throw error;
    }
  }
  
  /**
   * Build classification prompt for AI
   */
  buildClassificationPrompt(title, description, location) {
    const locationText = location?.address ? `Location: ${location.address}` : '';
    
    return `
You are an AI assistant for Indore Smart City's grievance management system. 
Analyze the following complaint and classify it accurately.

Complaint Title: "${title}"
Complaint Description: "${description}"
${locationText}

Available Categories: ${this.categories.join(', ')}
Available Departments: ${this.departments.join(', ')}
Available Priorities: ${this.priorities.join(', ')}

Rules:
1. Category must be one of the available categories
2. Department must be one of the available departments  
3. Priority must be one of: low, medium, high, critical
4. Confidence should be between 0 and 1
5. Keywords should be relevant terms from the complaint
6. Consider urgency, public safety impact, and severity for priority
7. Map categories to appropriate departments logically

Critical Priority: Life-threatening, emergency situations, major infrastructure failures
High Priority: Serious issues affecting many people, health risks, significant damage
Medium Priority: Standard complaints requiring attention, moderate impact
Low Priority: Minor issues, suggestions, cosmetic problems

Respond ONLY with valid JSON in this exact format:
{
  "category": "category_name",
  "department": "department_name", 
  "priority": "priority_level",
  "confidence": 0.85,
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "reasoning": "Brief explanation of classification logic"
}
`;
  }
  
  /**
   * Fallback keyword-based classification
   */
  fallbackClassification(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    const words = text.split(/\s+/);
    
    // Find category with highest keyword matches
    let bestCategory = 'Other';
    let maxMatches = 0;
    
    for (const [category, keywords] of Object.entries(this.keywordPatterns)) {
      const matches = keywords.filter(keyword => 
        text.includes(keyword.toLowerCase())
      ).length;
      
      if (matches > maxMatches) {
        maxMatches = matches;
        bestCategory = category;
      }
    }
    
    // Determine priority based on keywords
    let priority = 'medium';
    let priorityScore = 0;
    
    for (const [level, keywords] of Object.entries(this.priorityKeywords)) {
      const matches = keywords.filter(keyword => 
        text.includes(keyword.toLowerCase())
      ).length;
      
      if (matches > priorityScore) {
        priorityScore = matches;
        priority = level;
      }
    }
    
    // Map category to department
    const department = this.categoryDepartmentMap[bestCategory] || 'PWD';
    
    // Calculate confidence based on keyword matches
    const confidence = maxMatches > 0 ? Math.min(0.3 + (maxMatches * 0.1), 0.8) : 0.2;
    
    return {
      category: bestCategory,
      department,
      priority,
      confidence,
      keywords: this.extractKeywords(text),
      model: 'keyword-fallback',
      processedAt: new Date()
    };
  }
  
  /**
   * Extract relevant keywords from text
   */
  extractKeywords(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
    
    // Get unique words and return top 10
    const uniqueWords = [...new Set(words)];
    return uniqueWords.slice(0, 10);
  }
  
  /**
   * Check if word is a stop word
   */
  isStopWord(word) {
    const stopWords = [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'this', 'that', 'these',
      'those', 'very', 'just', 'only', 'also', 'even', 'still', 'already',
      'quite', 'really', 'actually', 'probably', 'maybe', 'perhaps'
    ];
    
    return stopWords.includes(word.toLowerCase());
  }
  
  /**
   * Validate classification result
   */
  validateClassificationResult(result) {
    // Ensure category is valid
    if (!this.categories.includes(result.category)) {
      console.warn(`Invalid category: ${result.category}, defaulting to 'Other'`);
      result.category = 'Other';
    }
    
    // Ensure department is valid
    if (!this.departments.includes(result.department)) {
      console.warn(`Invalid department: ${result.department}, mapping from category`);
      result.department = this.categoryDepartmentMap[result.category] || 'PWD';
    }
    
    // Ensure priority is valid
    if (!this.priorities.includes(result.priority)) {
      console.warn(`Invalid priority: ${result.priority}, defaulting to 'medium'`);
      result.priority = 'medium';
    }
    
    // Ensure confidence is valid
    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
      result.confidence = 0.5;
    }
    
    // Ensure keywords is an array
    if (!Array.isArray(result.keywords)) {
      result.keywords = [];
    }
    
    // Ensure required fields exist
    if (!result.model) {
      result.model = 'unknown';
    }
    
    if (!result.processedAt) {
      result.processedAt = new Date();
    }
    
    return result;
  }
  
  /**
   * Check if AI classification response is valid
   */
  isValidClassification(classification) {
    return (
      classification &&
      typeof classification === 'object' &&
      typeof classification.category === 'string' &&
      typeof classification.department === 'string' &&
      typeof classification.priority === 'string' &&
      (typeof classification.confidence === 'number' || classification.confidence === undefined)
    );
  }
  
  /**
   * Get classification statistics
   */
  async getClassificationStats() {
    // This would typically query the database for statistics
    // For now, return basic info about the service
    return {
      isAIEnabled: this.isAIEnabled,
      model: this.isAIEnabled ? 'gemini-pro' : 'keyword-fallback',
      categories: this.categories.length,
      departments: this.departments.length,
      priorities: this.priorities.length,
      lastInitialized: new Date()
    };
  }
  
  /**
   * Test classification with sample data
   */
  async testClassification() {
    const testCases = [
      {
        title: "Street light not working",
        description: "The street light near my house has been broken for 3 days. It's very dark at night."
      },
      {
        title: "Water supply issue",
        description: "No water supply in our area since morning. Very urgent problem."
      },
      {
        title: "Road pothole",
        description: "Large pothole on main road causing accidents. Needs immediate repair."
      }
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
      try {
        const result = await this.classifyComplaint(testCase.title, testCase.description);
        results.push({
          input: testCase,
          output: result,
          success: true
        });
      } catch (error) {
        results.push({
          input: testCase,
          error: error.message,
          success: false
        });
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const aiClassificationService = new AIClassificationService();
export default aiClassificationService;