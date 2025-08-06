const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Complaint = require('../models/Complaint');
const aiClassificationService = require('../services/aiClassificationService');

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/i-mitra', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected for seeding');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sample users data
const sampleUsers = [
  // Admin
  {
    name: 'System Administrator',
    email: 'admin@imitra.gov.in',
    phone: '9999999999',
    password: 'admin123',
    role: 'admin',
    isPhoneVerified: true,
    isEmailVerified: true
  },
  
  // Citizens
  {
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@gmail.com',
    phone: '9876543210',
    password: 'citizen123',
    role: 'citizen',
    address: '123 MG Road, Indore',
    zone: 'Zone 1',
    isPhoneVerified: true
  },
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@gmail.com',
    phone: '9876543211',
    password: 'citizen123',
    role: 'citizen',
    address: '456 AB Road, Indore',
    zone: 'Zone 2',
    isPhoneVerified: true
  },
  {
    name: 'Amit Patel',
    email: 'amit.patel@gmail.com',
    phone: '9876543212',
    password: 'citizen123',
    role: 'citizen',
    address: '789 Vijay Nagar, Indore',
    zone: 'Zone 3',
    isPhoneVerified: true
  },
  
  // Officers
  {
    name: 'Dr. Suresh Gupta',
    email: 'suresh.gupta@pwd.gov.in',
    phone: '9876543220',
    password: 'officer123',
    role: 'officer',
    department: 'PWD',
    employeeId: 'PWD001',
    isPhoneVerified: true
  },
  {
    name: 'Eng. Meera Singh',
    email: 'meera.singh@waterworks.gov.in',
    phone: '9876543221',
    password: 'officer123',
    role: 'officer',
    department: 'Water Works',
    employeeId: 'WW001',
    isPhoneVerified: true
  },
  {
    name: 'Mr. Ravi Verma',
    email: 'ravi.verma@electricity.gov.in',
    phone: '9876543222',
    password: 'officer123',
    role: 'officer',
    department: 'Electricity',
    employeeId: 'ELE001',
    isPhoneVerified: true
  },
  {
    name: 'Mrs. Sunita Jain',
    email: 'sunita.jain@sanitation.gov.in',
    phone: '9876543223',
    password: 'officer123',
    role: 'officer',
    department: 'Sanitation',
    employeeId: 'SAN001',
    isPhoneVerified: true
  },
  
  // Mitra (Field Staff)
  {
    name: 'Ramesh Yadav',
    email: 'ramesh.yadav@pwd.gov.in',
    phone: '9876543230',
    password: 'mitra123',
    role: 'mitra',
    department: 'PWD',
    employeeId: 'PWD-M001',
    isPhoneVerified: true
  },
  {
    name: 'Sanjay Kumar',
    email: 'sanjay.kumar@waterworks.gov.in',
    phone: '9876543231',
    password: 'mitra123',
    role: 'mitra',
    department: 'Water Works',
    employeeId: 'WW-M001',
    isPhoneVerified: true
  },
  {
    name: 'Deepak Sharma',
    email: 'deepak.sharma@electricity.gov.in',
    phone: '9876543232',
    password: 'mitra123',
    role: 'mitra',
    department: 'Electricity',
    employeeId: 'ELE-M001',
    isPhoneVerified: true
  },
  {
    name: 'Vijay Singh',
    email: 'vijay.singh@sanitation.gov.in',
    phone: '9876543233',
    password: 'mitra123',
    role: 'mitra',
    department: 'Sanitation',
    employeeId: 'SAN-M001',
    isPhoneVerified: true
  }
];

// Sample complaints data
const sampleComplaints = [
  {
    title: 'Large pothole on MG Road causing traffic issues',
    description: 'There is a very large pothole on MG Road near the main market that is causing severe traffic problems. Many vehicles are getting damaged and it has become dangerous for two-wheelers. The pothole has been there for over a month and is getting worse with each passing day.',
    location: {
      address: 'MG Road, near Main Market, Indore',
      zone: 'Zone 1',
      coordinates: { latitude: 22.7196, longitude: 75.8577 },
      landmark: 'Near Main Market'
    }
  },
  {
    title: 'Water supply disruption in Vijay Nagar area',
    description: 'Our area has been without water supply for the past 3 days. We have contacted the water department multiple times but no action has been taken. This is causing severe hardship for all residents, especially elderly people and children.',
    location: {
      address: 'Vijay Nagar, Sector 2, Indore',
      zone: 'Zone 3',
      coordinates: { latitude: 22.7532, longitude: 75.8937 },
      landmark: 'Near Vijay Nagar Square'
    }
  },
  {
    title: 'Street lights not working on AB Road',
    description: 'Multiple street lights on AB Road between Palasia and Geeta Bhawan are not working for the past week. This is creating safety issues for pedestrians and drivers, especially during night time. Urgent repair is needed.',
    location: {
      address: 'AB Road, between Palasia and Geeta Bhawan, Indore',
      zone: 'Zone 2',
      coordinates: { latitude: 22.7042, longitude: 75.8794 },
      landmark: 'Between Palasia and Geeta Bhawan'
    }
  },
  {
    title: 'Garbage not collected for 5 days in residential area',
    description: 'Garbage collection has been irregular in our residential area. It has not been collected for the past 5 days and is creating unhygienic conditions. Stray dogs are spreading the garbage around, making the situation worse.',
    location: {
      address: 'Annapurna Road, Indore',
      zone: 'Zone 4',
      coordinates: { latitude: 22.6953, longitude: 75.8567 },
      landmark: 'Near Annapurna Temple'
    }
  },
  {
    title: 'Traffic signal malfunction at major intersection',
    description: 'The traffic signal at the intersection of Ring Road and Khandwa Road has been malfunctioning since yesterday. It is stuck on red for all directions, causing massive traffic jams during peak hours.',
    location: {
      address: 'Ring Road and Khandwa Road intersection, Indore',
      zone: 'Zone 5',
      coordinates: { latitude: 22.6890, longitude: 75.8456 },
      landmark: 'Ring Road Khandwa Road intersection'
    }
  },
  {
    title: 'Broken water pipeline flooding the road',
    description: 'A major water pipeline has burst on Dewas Road causing flooding of the entire road. Water is being wasted and the road has become impassable. This needs immediate attention as it is a major route.',
    location: {
      address: 'Dewas Road, near Bus Stand, Indore',
      zone: 'Zone 6',
      coordinates: { latitude: 22.7234, longitude: 75.8123 },
      landmark: 'Near Bus Stand'
    }
  },
  {
    title: 'Power outage in industrial area for 2 days',
    description: 'The entire Sanwer Road industrial area has been without power for the past 2 days. This is causing huge losses to businesses and affecting production. Multiple complaints have been made but no response received.',
    location: {
      address: 'Sanwer Road Industrial Area, Indore',
      zone: 'Zone 1',
      coordinates: { latitude: 22.6789, longitude: 75.8234 },
      landmark: 'Industrial Area'
    }
  },
  {
    title: 'Overflowing sewage drain near school',
    description: 'The sewage drain near Government School on Sapna Sangeeta Road is overflowing badly. The smell is unbearable and it is creating health hazards for school children. Immediate cleaning is required.',
    location: {
      address: 'Sapna Sangeeta Road, near Government School, Indore',
      zone: 'Zone 2',
      coordinates: { latitude: 22.7123, longitude: 75.8678 },
      landmark: 'Near Government School'
    }
  }
];

// Seed function
const seedData = async () => {
  try {
    console.log('🌱 Starting data seeding...');
    
    // Clear existing data
    await User.deleteMany({});
    await Complaint.deleteMany({});
    console.log('🗑️  Cleared existing data');
    
    // Create users
    console.log('👥 Creating users...');
    const createdUsers = [];
    
    for (const userData of sampleUsers) {
      const user = await User.create(userData);
      createdUsers.push(user);
      console.log(`✅ Created ${user.role}: ${user.name}`);
    }
    
    // Get specific users for complaint creation
    const citizens = createdUsers.filter(user => user.role === 'citizen');
    const officers = createdUsers.filter(user => user.role === 'officer');
    const mitras = createdUsers.filter(user => user.role === 'mitra');
    
    // Create complaints
    console.log('📋 Creating complaints...');
    
    for (let i = 0; i < sampleComplaints.length; i++) {
      const complaintData = sampleComplaints[i];
      const citizen = citizens[i % citizens.length];
      
      try {
        // AI classify the complaint
        console.log(`🤖 Classifying complaint: "${complaintData.title}"`);
        const aiClassification = await aiClassificationService.classifyComplaint(
          complaintData.title,
          complaintData.description
        );
        
        // Generate complaint ID
        const complaintId = await Complaint.generateComplaintId();
        
        // Calculate SLA deadline
        const slaDeadline = Complaint.calculateSLADeadline(
          aiClassification.priority,
          aiClassification.department
        );
        
        // Find relevant officer and mitra for this department
        const officer = officers.find(o => o.department === aiClassification.department);
        const mitra = mitras.find(m => m.department === aiClassification.department);
        
        // Create complaint
        const complaint = await Complaint.create({
          complaintId,
          title: complaintData.title,
          description: complaintData.description,
          citizen: citizen._id,
          location: complaintData.location,
          aiClassification,
          sla: {
            deadline: slaDeadline,
            remainingHours: Math.ceil((slaDeadline - new Date()) / (1000 * 60 * 60)),
            status: 'safe'
          },
          status: Math.random() > 0.3 ? 'assigned' : 'new', // 70% assigned, 30% new
          assignedOfficer: officer ? officer._id : null,
          assignedMitra: Math.random() > 0.4 && mitra ? mitra._id : null, // 60% assigned to mitra
          mitraPhone: Math.random() > 0.4 && mitra ? mitra.phone : null
        });
        
        // Add some timeline entries for assigned complaints
        if (complaint.status === 'assigned' && officer) {
          await complaint.addTimelineEntry(
            'assigned_officer',
            `Complaint assigned to officer ${officer.name}`,
            officer._id,
            'Auto-assigned during seeding'
          );
          
          if (complaint.assignedMitra && mitra) {
            await complaint.addTimelineEntry(
              'assigned_mitra',
              `Complaint assigned to mitra ${mitra.name}`,
              officer._id,
              'Auto-assigned during seeding'
            );
          }
        }
        
        // Randomly resolve some complaints and add feedback
        if (Math.random() > 0.6) { // 40% resolved
          complaint.status = 'resolved';
          const resolutionTime = Math.floor(Math.random() * 48) + 4; // 4-52 hours
          complaint.resolution = {
            description: 'Issue resolved successfully',
            resolvedBy: mitra ? mitra._id : officer._id,
            resolvedAt: new Date(),
            resolutionTime
          };
          
          // Add citizen feedback for some resolved complaints
          if (Math.random() > 0.3) { // 70% feedback rate
            const rating = Math.floor(Math.random() * 2) + 4; // 4-5 rating
            complaint.citizenFeedback = {
              rating,
              satisfied: rating >= 4,
              comments: rating >= 4 ? 'Good service, resolved quickly' : 'Could be better',
              submittedAt: new Date()
            };
            
            if (rating >= 4) {
              complaint.status = 'closed';
            }
          }
          
          await complaint.save();
        }
        
        console.log(`✅ Created complaint: ${complaintId} (${aiClassification.category})`);
        
      } catch (error) {
        console.error(`❌ Error creating complaint "${complaintData.title}":`, error.message);
      }
    }
    
    // Update mitra assignments
    console.log('🔗 Updating mitra assignments...');
    for (const mitra of mitras) {
      const officer = officers.find(o => o.department === mitra.department);
      if (officer) {
        mitra.assignedOfficer = officer._id;
        await mitra.save();
        console.log(`✅ Assigned mitra ${mitra.name} to officer ${officer.name}`);
      }
    }
    
    // Display summary
    const userCounts = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    const complaintCounts = await Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    console.log('\n📊 Seeding Summary:');
    console.log('Users created:');
    userCounts.forEach(item => {
      console.log(`  ${item._id}: ${item.count}`);
    });
    
    console.log('Complaints created:');
    complaintCounts.forEach(item => {
      console.log(`  ${item._id}: ${item.count}`);
    });
    
    console.log('\n🎉 Data seeding completed successfully!');
    console.log('\n🔑 Login Credentials:');
    console.log('Admin: admin@imitra.gov.in / admin123');
    console.log('Citizen: rajesh.kumar@gmail.com / citizen123');
    console.log('Officer: suresh.gupta@pwd.gov.in / officer123');
    console.log('Mitra: ramesh.yadav@pwd.gov.in / mitra123');
    
  } catch (error) {
    console.error('❌ Seeding error:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  connectDB().then(seedData);
}

module.exports = seedData;