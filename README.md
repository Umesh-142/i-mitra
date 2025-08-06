# 🔥 i-Mitra: Indore Smart City - Intelligent Multi-Role Grievance Management System

![i-Mitra Banner](https://img.shields.io/badge/i--Mitra-Indore%20Smart%20City-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.0-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)

**i-Mitra** is a comprehensive, AI-driven grievance management platform designed specifically for Indore Smart City. It features intelligent complaint routing, real-time tracking, multi-role dashboards, and advanced analytics to streamline citizen services and improve municipal efficiency.

## 🌟 Key Features

### 🤖 **AI-Powered Smart Features**
- **Intelligent Complaint Classification**: Gemini AI automatically categorizes complaints and assigns them to the correct department
- **Priority Assessment**: AI determines complaint priority (Critical, High, Medium, Low) based on content analysis
- **SLA Management**: Automated deadline calculation and breach monitoring with color-coded indicators
- **Real-time Updates**: Socket.io integration for instant notifications and dashboard updates

### 👥 **Multi-Role System**
- **Citizens**: File complaints, track progress, provide feedback, view analytics
- **Officers**: Manage department complaints, assign field staff, monitor SLA compliance
- **Mitra (Field Staff)**: Handle assigned complaints, update progress, upload resolution proof
- **Administrators**: System-wide oversight, analytics, user management, escalation handling

### 🌐 **Modern Technology Stack**
- **Frontend**: React 18, Vite, Tailwind CSS, Socket.io Client
- **Backend**: Node.js, Express.js, MongoDB, Socket.io
- **AI Integration**: Google Gemini API for complaint classification
- **Authentication**: JWT-based secure authentication
- **Real-time**: Socket.io for live updates
- **Responsive**: Mobile-first design with PWA capabilities

### 🌍 **Localization & Accessibility**
- **Bilingual Support**: Complete English/Hindi interface
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Accessibility**: WCAG compliant with screen reader support

## 📋 System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React SPA     │    │   Express API    │    │   MongoDB       │
│   (Frontend)    │◄──►│   (Backend)      │◄──►│   (Database)    │
│                 │    │                  │    │                 │
│ • Multi-role UI │    │ • JWT Auth       │    │ • User Data     │
│ • Real-time     │    │ • AI Integration │    │ • Complaints    │
│ • Responsive    │    │ • Socket.io      │    │ • Analytics     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Gemini AI      │
                    │   (Classification)│
                    └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (v5.0 or higher)
- **npm** or **yarn**
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd i-mitra
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Environment Setup**
   ```bash
   # Copy environment files
   cp backend/.env.example backend/.env
   ```

4. **Configure Environment Variables**
   
   Edit `backend/.env`:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/i-mitra
   
   # JWT
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d
   
   # AI Integration (Optional - will use fallback if not provided)
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Notifications (Optional)
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=your_twilio_phone
   
   EMAIL_HOST=smtp.gmail.com
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

5. **Start MongoDB**
   ```bash
   # Using MongoDB service
   sudo systemctl start mongod
   
   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

6. **Seed the Database**
   ```bash
   npm run seed
   ```

7. **Start the Application**
   ```bash
   # Development mode (both frontend and backend)
   npm run dev
   
   # Or start individually
   npm run server:dev  # Backend only
   npm run client:dev  # Frontend only
   ```

8. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/api/health

## 🔑 Demo Credentials

The system comes with pre-seeded demo accounts for testing:

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| **Admin** | admin@imitra.gov.in | admin123 | Full system access |
| **Citizen** | rajesh.kumar@gmail.com | citizen123 | File and track complaints |
| **Officer** | suresh.gupta@pwd.gov.in | officer123 | PWD Department Officer |
| **Mitra** | ramesh.yadav@pwd.gov.in | mitra123 | PWD Field Staff |

Additional demo accounts are available for different departments (Water Works, Electricity, Sanitation, etc.)

## 📱 User Workflows

### 🏠 **Citizen Journey**
1. **Register/Login** → Create account or sign in
2. **File Complaint** → Provide title, description, location, attachments
3. **AI Processing** → System auto-classifies and routes complaint
4. **Track Progress** → Real-time status updates and timeline view
5. **Provide Feedback** → Rate resolution and provide comments
6. **View Analytics** → Personal complaint history and zone statistics

### 👮 **Officer Journey**
1. **Login** → Access department dashboard
2. **Review Complaints** → View all department complaints with filters
3. **Assign Mitra** → Delegate fieldwork to available staff
4. **Monitor SLA** → Track deadlines and breach alerts
5. **Update Status** → Add remarks and change complaint status
6. **Handle Feedback** → Process citizen satisfaction responses
7. **Analytics** → Department performance and trends

### 🔧 **Mitra Journey**
1. **Login** → View assigned complaints
2. **Field Work** → Access complaint details and location
3. **Update Progress** → Change status with mandatory remarks
4. **Upload Proof** → Add photos/videos of resolution
5. **Complete Work** → Mark complaints as resolved
6. **Track Performance** → View work history and ratings

### 👑 **Admin Journey**
1. **Login** → System-wide dashboard access
2. **Monitor All** → Cross-department complaint overview
3. **Manage Users** → Add/edit/deactivate user accounts
4. **Handle Escalations** → Resolve complex or breached SLA cases
5. **Advanced Analytics** → City-wide reports and insights
6. **System Management** → Configuration and maintenance

## 🎯 Core Features Detailed

### 🤖 **AI Classification Engine**
- **Natural Language Processing**: Analyzes complaint text for automatic categorization
- **Department Routing**: Intelligently assigns complaints to correct municipal department
- **Priority Assessment**: Determines urgency based on keywords and context
- **Confidence Scoring**: Provides AI confidence levels for manual review
- **Fallback System**: Keyword-based classification when AI is unavailable

### 📊 **SLA Management**
- **Dynamic Deadlines**: Priority and department-based SLA calculation
- **Visual Indicators**: Color-coded status (Safe, Warning, Critical, Breached)
- **Automatic Alerts**: Notifications for approaching deadlines
- **Escalation Logic**: Automated escalation for breached SLAs
- **Performance Tracking**: SLA compliance metrics and reports

### 🔄 **Real-Time System**
- **Live Updates**: Instant dashboard refresh on status changes
- **Push Notifications**: Real-time alerts for all stakeholders
- **Socket.io Integration**: Efficient WebSocket communication
- **Role-based Rooms**: Targeted notifications by user role and department

### 📈 **Analytics & Reporting**
- **Interactive Dashboards**: Role-specific analytics views
- **Trend Analysis**: Historical data and pattern recognition
- **Performance Metrics**: Resolution rates, SLA compliance, satisfaction scores
- **Zone-wise Reports**: Geographic complaint distribution and hotspots
- **Export Capabilities**: PDF and Excel report generation

## 🏗️ Technical Architecture

### **Backend Structure**
```
backend/
├── controllers/          # Request handlers
├── middleware/          # Auth, validation, error handling
├── models/             # MongoDB schemas
├── routes/             # API endpoints
├── services/           # Business logic (AI, notifications)
├── utils/              # Helper functions
├── scripts/            # Database seeding
└── uploads/            # File storage
```

### **Frontend Structure**
```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React contexts (Auth, Language, Socket)
│   ├── pages/          # Route components
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Helper functions
│   └── styles/         # CSS and Tailwind config
```

### **API Endpoints**
```
/api/auth/*             # Authentication & user management
/api/complaints/*       # Complaint CRUD operations
/api/analytics/*        # Dashboard and reporting data
/api/notifications/*    # Notification preferences
/api/users/*           # User profile management
```

## 🔧 Configuration

### **Environment Variables**
- `MONGODB_URI`: Database connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `GEMINI_API_KEY`: Google AI API key (optional)
- `TWILIO_*`: SMS notification settings (optional)
- `EMAIL_*`: Email notification settings (optional)
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)

### **Database Configuration**
- **MongoDB**: Document-based storage for flexibility
- **Indexes**: Optimized for query performance
- **Aggregation**: Complex analytics queries
- **Transactions**: Data consistency for critical operations

## 🚦 Development

### **Available Scripts**
```bash
npm run dev              # Start both frontend and backend
npm run server:dev       # Start backend only
npm run client:dev       # Start frontend only
npm run seed            # Seed database with demo data
npm run install:all     # Install all dependencies
```

### **Code Standards**
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **JSDoc**: Function documentation
- **Git Hooks**: Pre-commit validation

## 🧪 Testing

### **Demo Data**
The system includes comprehensive seed data:
- **12+ Users**: Across all roles and departments
- **8+ Complaints**: Various statuses and priorities
- **Realistic Data**: Indore-specific locations and scenarios
- **Complete Workflows**: End-to-end user journeys

### **Test Scenarios**
1. **Complaint Lifecycle**: File → Classify → Assign → Resolve → Feedback
2. **Role Permissions**: Access control and data isolation
3. **Real-time Updates**: Socket.io event handling
4. **SLA Management**: Deadline tracking and breach handling
5. **Multi-language**: English/Hindi interface switching

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access**: Granular permission system
- **Input Validation**: Comprehensive data validation
- **Rate Limiting**: API abuse prevention
- **File Upload Security**: Type and size restrictions
- **CORS Protection**: Cross-origin request security

## 🌍 Localization

### **Supported Languages**
- **English**: Default interface language
- **Hindi**: Complete translation for local users
- **Dynamic Switching**: Real-time language toggle
- **Persistent Settings**: User language preference storage

## 📱 Mobile Support

- **Responsive Design**: Mobile-first approach
- **Touch Optimized**: Mobile-friendly interactions
- **Progressive Web App**: PWA capabilities
- **Offline Support**: Basic functionality without internet

## 🚀 Deployment

### **Production Setup**
1. **Environment**: Set `NODE_ENV=production`
2. **Database**: Use MongoDB Atlas or dedicated server
3. **SSL**: Configure HTTPS certificates
4. **Process Management**: Use PM2 or similar
5. **Load Balancing**: Nginx reverse proxy
6. **Monitoring**: Error tracking and performance monitoring

### **Docker Support**
```dockerfile
# Example Docker setup
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Indore Smart City Initiative**: For the vision and requirements
- **Google Gemini AI**: For intelligent complaint classification
- **Open Source Community**: For the amazing tools and libraries
- **Contributors**: For their valuable input and feedback

## 📞 Support

For support and questions:
- **Email**: support@imitra.gov.in
- **Documentation**: [Wiki](wiki-url)
- **Issues**: [GitHub Issues](issues-url)

---

**Built with ❤️ for Indore Smart City**

*Transforming citizen services through intelligent technology*