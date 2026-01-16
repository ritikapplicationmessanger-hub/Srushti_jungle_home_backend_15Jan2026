
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const helmet = require('helmet');

const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const {
  addMonths,
  setDate,
  endOfMonth,
  startOfMonth,
  format,
} = require('date-fns');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const cron = require('node-cron');
require('dotenv').config();
const tokenBlacklist = new Set();

// ------------------- CONFIG -------------------
const MONGO_URI =
  process.env.MONGO_URI ;
const JWT_SECRET = process.env.JWT_SECRET;
const GMAIL_EMAIL = process.env.GMAIL_EMAIL;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const PORT = process.env.PORT || 4000;

// ------------------- UPLOADS -------------------
const uploadDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created uploads folder');
}

// ------------------- MONGOOSE CONNECTION -------------------
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB Atlas');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

//------------------- automatic  reward generator -------------------
cron.schedule("1 1 1 * *", async () => {
  console.log("Running Auto Monthly Agent Reward Generator...");
  await generateAgentRewards();
});


// ------------------- SCHEMAS -------------------
const profileSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  first_name: String,
  last_name: String,
  role: {
    type: String,
    enum: ['super_admin', 'manager', 'office_staff'],
    required: true,
  },
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const customerSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  email: String,
  phone: String,
  address: String,
  pan_number: String,
  aadhar_number: String,
  plan_id: { type: String, required: true },
  investment_amount: Number,
  // investment_date: String,
  investment_date: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]  
    
  },
  return_method: {
    type: String,
    enum: ['Bank', 'Cash', 'USDT', 'Pre-IPO'],
    default: 'Bank',
    required: true
  },
  nominee: String,
  nominee_adhar_pan_number: String,
  approval_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'settled'],
    default: 'pending',
  },
  submitted_by: String,
  reviewed_by: String,
  review_comments: String,
  approved_at: Date,
  created_at: { type: Date, default: Date.now },
  updated_at: Date,
  images: [String],
  agent_id: String,
  bank_name: String,
  account_number: String,
  ifsc_code: String,
  branch: String,
  payable_balance_amount_by_company: Number,
  total_paid_amount_to_customer: Number,
});

const agentSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  email: String,
  phone: String,
  address: String,
  pan_number: String,
  agent_type: { type: String, enum: ['Main', 'Sub'], default: 'Main' },
  parent_agent_id: { type: String, default: null },
  commission_percentage: Number,
  approval_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  submitted_by: String,
  reviewed_by: String,
  review_comments: String,
  approved_at: Date,
  created_at: { type: Date, default: Date.now },
  updated_at: Date,
  images: [String],
  bank_name: String,
  account_number: String,
  ifsc_code: String,
  branch: String,
});

const companyInvestmentSchema = new mongoose.Schema({
  investment_name: String,
  description: String,
  investment_amount: Number,
  expected_return: Number,
  return_percentage: Number,
  investment_date: String,
  duration_months: Number,
  approval_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  submitted_by: String,
  reviewed_by: String,
  review_comments: String,
  approved_at: Date,
  created_at: { type: Date, default: Date.now },
  updated_at: Date,
  images: [String],
});

const planSchema = new mongoose.Schema({
  name: String,
  segment: {
    type: String,
    enum: ['PRE-IPO', 'REAL ESTATE', 'DIRECT', 'INFRASTRUCTURE', 'TRAVEL', 'INVESTMENT'],
  },
  investment_amount: Number,
  duration_months: Number,
  return_percentage: Number,
  discount_percentage: Number,
  payment_type: { type: String, enum: ['Monthly', 'Buyback'] },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: Date,
  created_by: String,
});

const paymentScheduleSchema = new mongoose.Schema({
  customer_id: String,
  amount: Number,
  payment_date: String,
  payment_type: String,
  is_paid: { type: Boolean, default: false },
  paid_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  is_principal: Boolean,
  interest_amount: Number,
  principal_amount: Number,
  start_date: String,
  payout_month: Number,
  transaction_id: { type: String, default: null },
  payment_method: {
    type: String,
    enum: ['Cash', 'Online', 'Cheq', 'Other', 'None'],
    default: 'None',
  },
  images: { type: [String], default: [] },
});

const agentPaymentSchema = new mongoose.Schema({
  agent_id: String,
  customer_id: String,
  amount: Number,
  payment_date: String,
  is_paid: { type: Boolean, default: false },
  paid_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  method: {
    type: String,
    enum: ['Cash', 'Online', 'Cheq', 'Other', 'None'],
    default: 'None',
  },
  transaction_id: { type: String, default: null },
  images: { type: [String], default: [] },
});


const investmentPaymentSchema = new mongoose.Schema({
  investment_id: String,

  amount: Number,               
  interest_amount: Number,      
  principal_amount: Number,     

  payment_type: {               
    type: String,
    enum: ['Monthly', 'Yearly'],
    required: true
  },

  payout_cycle: Number,         

  payment_date: String,
  is_paid: { type: Boolean, default: false },
  paid_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },

  transaction_id: { type: String, default: null },
  payment_method: {
    type: String,
    enum: ['Cash', 'Online', 'Cheq', 'Other', 'None'],
    default: 'None',
  },
  images: { type: [String], default: [] },
});


const giftPlanSchema = new mongoose.Schema({
  name: String,
  description: String,
  target_investors: Number,
  target_amount: Number,
  reward_type: { type: String, enum: ['BONUS', 'PHYSICAL'] },
  reward_value: Number,
  duration_months: Number,
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: Date,
});

const agentRewardSchema = new mongoose.Schema({
  agent_id: String,
  gift_plan_id: String,
  performance_month: String,
  achieved_investors: Number,
  achieved_amount: Number,
  is_rewarded: { type: Boolean, default: false },
  rewarded_at: { type: Date, default: null },
  reward_method: {
    type: String,
    enum: ['Cash', 'Online', 'Cheq', 'Other', 'None'],
    default: 'None',
  },
  transaction_id: { type: String, default: null },
  images: { type: [String], default: [] },
  created_at: { type: Date, default: Date.now },
});

const otpTokenSchema = new mongoose.Schema({
  email: String,
  hashed_otp: String,
  created_at: { type: Date, default: Date.now },
});

const auditTrailSchema = new mongoose.Schema({
  table_name: String,
  record_id: String,
  action: String,
  old_values: Object,
  new_values: Object,
  performed_by: String,
  created_at: { type: Date, default: Date.now },
});


const bonusPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  target_investors: Number,
  target_amount: Number,
  reward_type: { type: String, enum: ['BONUS','PHYSICAL'], required: true },
  reward_value: mongoose.Schema.Types.Mixed, 
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  duration_months: Number,
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: Date
});

const agentBonusSchema = new mongoose.Schema({
  agent_id: { type: String, required: true },
  reward_plan_id: { type: String, required: true },
  performance_month: String,

  achieved_investors: Number,
  achieved_amount: Number,

  reward_type: { type: String, enum: ['BONUS', 'PHYSICAL'], required: true },
  reward_value: mongoose.Schema.Types.Mixed,

 
  reward_method: {
    type: String,
    enum: ['Cash', 'Online', 'Cheq', 'Other', 'None'],
    default: 'None'
  },

  amount: Number,
  physical_description: String,
  transaction_id: String,

  is_rewarded: { type: Boolean, default: false },
  rewarded_at: Date,

  images: { type: [String], default: [] },

  created_at: { type: Date, default: Date.now }
});


const rdPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  return_percentage: { type: Number, required: true }, 
  duration_months: { type: Number, required: true },    
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});


const rdCustomerSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  email: String,
  phone: String,
  address: String,
  pan_number: String,
  aadhar_number: String,
  nominee_name: String,                 // nominee name
  nominee_pan_aadhar: String,           // combined nominee PAN/Aadhaar
  plan_id: { type: String, required: true },           // reference to RdPlan
  installment_amount: { type: Number, required: true },// monthly installment specified per customer
  investment_date: {
    type: String,
    default: () => new Date().toISOString().split('T')[0] // default to today's date
  },
  agent_id: {
    type: String,
    ref: 'Agent',
    required: false
  },
  approval_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'settled'],
    default: 'pending',
  },
  submitted_by: String,
  reviewed_by: String,
  review_comments: String,
  approved_at: Date,
  created_at: { type: Date, default: Date.now },
  updated_at: Date,
  images: [String],
  bank_name: String,
  account_number: String,
  ifsc_code: String,
  branch: String,
});

// const rdInstallmentSchema = new mongoose.Schema({
//   rd_customer_id: String,
//   installment_no: Number,
//   amount: Number,
//   payment_date: String,                  
//   is_paid: { type: Boolean, default: false },
//   paid_at: Date,
//   payment_method: {
//     type: String,
//     enum: ['Cash', 'Online', 'Cheq', 'Other', 'None'],
//     default: 'None',
//   },
//   transaction_id: String,
//   cheque_number: String,
//   images: { type: [String], default: [] },
//   is_final_payout: { type: Boolean, default: false },
//   created_at: { type: Date, default: Date.now },
//   updated_at: Date
// });
const rdInstallmentSchema = new mongoose.Schema({
  rd_customer_id: String,
  installment_no: Number,
  amount: Number,
  payment_date: String,
  is_paid: { type: Boolean, default: false },
  paid_at: Date,
  payment_method: {
    type: String,
    enum: ['Cash', 'Online', 'Cheq', 'Other', 'None'],
    default: 'None'
  },
  transaction_id: String,
  cheque_number: String,
  images: [String],
  created_at: { type: Date, default: Date.now },
  updated_at: Date
});


// const rdPaymentSchema = new mongoose.Schema({
//   rd_customer_id: String,
//   installment_id: String,                  // reference to RdInstallment
//   scheduled_payment_date: String,          // installment.payment_date
//   payment_type: {
//     type: String,
//     enum: ['Cash', 'Online', 'Cheq', 'Other'],
//     default: 'Cash'
//   },
//   transaction_id: String,
//   cheque_number: String,
//   is_paid: { type: Boolean, default: true }, // created when marking installment paid
//   payment_date: { type: String, default: () => new Date().toISOString().split('T')[0] }, // actual received date
//   amount: Number,
//   images: { type: [String], default: [] },
//   created_at: { type: Date, default: Date.now },
//   updated_at: Date
// });

const rdPaymentSchema = new mongoose.Schema({
  rd_customer_id: String,

  scheduled_payment_date: String, // maturity date
  payment_date: String,           // actual paid date

  amount: Number,

  payment_method: {
    type: String,
    enum: ['Cash', 'Online', 'Cheq', 'Other', 'None'],
    default: 'None'
  },

  transaction_id: String,
  cheque_number: String,

  is_paid: { type: Boolean, default: false },

  images: [String],

  created_at: { type: Date, default: Date.now },
  updated_at: Date
});


const rdAgentPaymentSchema = new mongoose.Schema({
  agent_id: String,
  rd_customer_id: String,
  installment_id: String,
  amount: Number,
  payment_date: String,
  is_paid: { type: Boolean, default: false },
  paid_at: Date,
  transaction_id: String,
  method: {
    type: String,
    enum: ['Cash', 'Online', 'Cheq', 'Other', 'None'],
    default: 'None'
  },
  images: { type: [String], default: [] },
  created_at: { type: Date, default: Date.now },
  updated_at: Date
});


const rdPenaltySchema = new mongoose.Schema({
  rd_customer_id: {
    type: String,
    required: true
  },
  installment_id: {
    type: String,
    required: true
  },
  penalty_month: {
    type: String, // YYYY-MM
    required: true
  },
  penalty_amount: {
    type: Number,
    default: 1000
  },
  reason: {
    type: String,
    default: 'Late installment payment'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// ------------------- MODELS -------------------
const Profile = mongoose.model('Profile', profileSchema);
const Customer = mongoose.model('Customer', customerSchema);
const Agent = mongoose.model('Agent', agentSchema);
const CompanyInvestment = mongoose.model('CompanyInvestment', companyInvestmentSchema);
const Plan = mongoose.model('Plan', planSchema);
const PaymentSchedule = mongoose.model('PaymentSchedule', paymentScheduleSchema);
const AgentPayment = mongoose.model('AgentPayment', agentPaymentSchema);
const InvestmentPayment = mongoose.model('InvestmentPayment', investmentPaymentSchema);
const GiftPlan = mongoose.model('GiftPlan', giftPlanSchema);
const AgentReward = mongoose.model('AgentReward', agentRewardSchema);
const OtpToken = mongoose.model('OtpToken', otpTokenSchema);
const AuditTrail = mongoose.model('AuditTrail', auditTrailSchema);
const BonusPlan = mongoose.model('BonusPlan', bonusPlanSchema);
const AgentBonus = mongoose.model("AgentBonus", agentBonusSchema);
const RdPlan = mongoose.model('RdPlan', rdPlanSchema);
const RdCustomer = mongoose.model('RdCustomer', rdCustomerSchema);
const RdInstallment = mongoose.model('RdInstallment', rdInstallmentSchema);
const RdPayment = mongoose.model('RdPayment', rdPaymentSchema);
const RdAgentPayment = mongoose.model('RdAgentPayment', rdAgentPaymentSchema);
const RdPenalty = mongoose.model('RdPenalty', rdPenaltySchema);

// ------------------- EMAIL & MULTER -------------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_EMAIL, pass: GMAIL_APP_PASSWORD },
  secure: true,
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      return cb(new Error('Only JPG/PNG allowed'));
    }
    cb(null, true);
  },
});

// ------------------- RATE LIMIT -------------------
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
});

// ------------------- ZOD SCHEMAS -------------------
const ProfileCreateSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: z.enum(['super_admin', 'manager', 'office_staff']),
});

const CustomerCreateSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  pan_number: z.string().optional(),
  aadhar_number: z.string().optional(),
  plan_id: z.string(),
  investment_amount: z.number().positive(),
  investment_date: z.string().optional(),
  nominee: z.string().optional(),
  nominee_adhar_pan_number: z.string().optional(),
  agent_id: z.string().optional(),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  ifsc_code: z.string().optional(),
  branch: z.string().optional(),
  return_method: z.enum(['Bank', 'Cash', 'USDT', 'Pre-IPO']).optional()
});

const AgentCreateSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  pan_number: z.string().optional(),
  agent_type: z.enum(['Main', 'Sub']),
  parent_agent_id: z.string().optional(),
  commission_percentage: z.number().positive().max(100),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  ifsc_code: z.string().optional(),
  branch: z.string().optional(),
});

const CompanyInvestmentCreateSchema = z.object({
  investment_name: z.string().min(1),
  description: z.string().optional(),
  investment_amount: z.number().positive(),
  expected_return: z.number().positive().optional(),
  return_percentage: z.number().positive().optional(),
  investment_date: z.string(),
  duration_months: z.number().positive(),
});



const PlanCreateSchema = z.object({
  name: z.string().min(1),
  segment: z.enum(['PRE-IPO', 'REAL ESTATE', 'DIRECT', 'INFRASTRUCTURE', 'TRAVEL', 'INVESTMENT']),
  investment_amount: z.number().optional(),
  duration_months: z.number().positive(),
  return_percentage: z.number().optional(),
  discount_percentage: z.number().optional(),
  payment_type: z.enum(["Monthly", "Buyback"]).optional(),
  is_active: z.boolean().default(true),
}).superRefine((data, ctx) => {

 
  if (data.segment !== "INFRASTRUCTURE") {
    if (data.investment_amount == null || data.investment_amount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "investment_amount is required and must be > 0 for this segment",
        path: ["investment_amount"],
      });
    }

    if (data.return_percentage == null || data.return_percentage <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "return_percentage is required and must be > 0 for this segment",
        path: ["return_percentage"],
      });
    }
  }

 
});


const AgentPaymentCreateSchema = z.object({
  agent_id: z.string(),
  customer_id: z.string().optional(),
  amount: z.number().positive(),
  payment_date: z.string(),
  method: z.string().optional(),
  transaction_id: z.string().optional(),
});

const GiftPlanCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  target_investors: z.number().positive(),
  target_amount: z.number().positive(),
  reward_type: z.enum(['BONUS', 'PHYSICAL']),
  reward_value: z.number().positive(),
  duration_months: z.number().positive(),
  is_active: z.boolean().default(true),
});

const AgentRewardCreateSchema = z.object({
  agent_id: z.string(),
  gift_plan_id: z.string(),
  performance_month: z.string().regex(/^\d{4}-\d{2}$/),
  achieved_investors: z.number().min(0),
  achieved_amount: z.number().min(0),
});

const BonusPlanCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  target_investors: z.number().min(0).optional(),
  target_amount: z.number().min(0).optional(),
  reward_type: z.enum(['BONUS', 'PHYSICAL']),
  reward_value: z.any(),
  end_date: z.string() 
}).refine(data => {
  if (data.reward_type === 'BONUS') return typeof data.reward_value === 'number';
  if (data.reward_type === 'PHYSICAL') return typeof data.reward_value === 'string';
  return false;
}, { message: 'reward_value must match reward_type', path: ['reward_value'] });

const AgentBonusPaymentSchema = z.object({
  bonus_id: z.string(),
  reward_method: z.enum(['Cash','Online','Cheq','Other','None']),
  amount: z.number().optional(),
  transaction_id: z.string().optional(),
  physical_description: z.string().optional()
});

const RdPlanCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  return_percentage: z.number().nonnegative(),
  duration_months: z.number().positive(),
  is_active: z.boolean().optional()
});

const RdCustomerCreateSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  plan_id: z.string(),
  address: z.string().optional(),
  pan_number: z.string().optional(),
  aadhar_number: z.string().optional(),
  installment_amount: z.number().positive(), // required on customer level
  investment_date: z.string().optional(), // optional; defaulted in schema if missing
  agent_id: z.string().optional(),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  ifsc_code: z.string().optional(),
  branch: z.string().optional(),
  nominee_name: z.string().optional(),
  nominee_pan_aadhar: z.string().optional()
});

const RdInstallmentMarkPaidSchema = z.object({
  method: z.enum(['Cash','Online','Cheq','Other']).optional(),
  transaction_id: z.string().optional(),
  cheque_number: z.string().optional()
});


// ------------------- UTILS -------------------
async function hashPassword(p) {
  return await bcrypt.hash(p, 10);
}
function generateToken(p) {
  return jwt.sign(p, JWT_SECRET, { expiresIn: '24h' });
}


function verifyToken(t) {
  try {
    if (tokenBlacklist.has(t)) {
      throw new Error('Token has been revoked');
    }
    return jwt.verify(t, JWT_SECRET);
  } catch (err) {
    throw new Error('Invalid or revoked token');
  }
}
async function auditLog(table, id, action, oldV, newV, by) {
  try {
    await AuditTrail.create({
      table_name: table,
      record_id: id,
      action,
      old_values: oldV,
      new_values: newV,
      performed_by: by,
    });
  } catch (e) {
    console.error('Audit error:', e);
  }
}
async function maskPII(data, role) {
  if (role === 'office_staff') {
    return {
      ...data,
      address: data.address ? 'HIDDEN' : undefined,
      pan_number: data.pan_number ? 'HIDDEN' : undefined,
      aadhar_number: data.aadhar_number ? 'HIDDEN' : undefined,
      nominee: data.nominee ? 'HIDDEN' : undefined,
      nominee_adhar_pan_number: data.nominee_adhar_pan_number ? 'HIDDEN' : undefined,
    };
  }
  return data;
}
async function uploadImages(files) {
  // const urls = files.map(
  //   (f) => `http://localhost:${PORT}/uploads/${f.filename}`
  // );
  const baseUrl = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

  const urls = files.map((f) =>
    `${baseUrl}/uploads/${f.filename}`
  );
  await auditLog('images', uuidv4(), 'UPLOAD_IMAGE', null, { urls }, null);
  return urls;
}
function calculateReturnFields({
  investment_amount,
  expected_return,
  return_percentage,
  duration_months,
}) {
  if (expected_return && !return_percentage) {
    return_percentage =
      (expected_return / investment_amount) * 100 * 12 / duration_months;
  } else if (return_percentage && !expected_return) {
    expected_return =
      investment_amount * (return_percentage / 100) * duration_months / 12;
  }
  return { expected_return, return_percentage };
}


function getMonthlyPayoutDate(startDate, monthOffset, payoutDay) {
  const year = startDate.getUTCFullYear();
  const month = startDate.getUTCMonth() + monthOffset;

  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(payoutDay, lastDayOfMonth);

  return new Date(Date.UTC(year, month, day));
}

async function generatePaymentSchedule(customer_id, amount, invDate, plan) {
  

const base = new Date(invDate || new Date());
const investDay = base.getDate();

// Rule: <=15 → 15, >15 → 30
const basePayoutDay = investDay <= 15 ? 15 : 30;

// First payout month = next month
const firstPayoutMonth = base.getMonth() + 1;
const firstPayoutYear = base.getFullYear();

// February exception ONLY for first payout
let firstPayoutDay = basePayoutDay;
if (basePayoutDay === 30 && firstPayoutMonth === 1) {
  firstPayoutDay = new Date(
    firstPayoutYear,
    firstPayoutMonth + 1,
    0
  ).getDate();
}

// First payout date
const first = new Date(
  Date.UTC(firstPayoutYear, firstPayoutMonth, firstPayoutDay)
);

const start = first.toISOString().split("T")[0];

const schedules = [];
const duration = Number(plan.duration_months || 12);
const iso = (d) => d.toISOString().split("T")[0];



  

 
  if (plan.segment === 'INFRASTRUCTURE') {
    
    const principalAmount = amount;      
  const durationMonths = duration;     

  if (plan.payment_type === 'Buyback') {

   
    schedules.push({
      customer_id,
      amount: principalAmount,         
      payment_date: iso(getMonthlyPayoutDate(first, duration, basePayoutDay)),
      payment_type: 'Buyback',
      is_paid: false,
      is_principal: true,
      principal_amount: principalAmount,
      interest_amount: 0,
      start_date: start,
      payout_month: 1,
    });

  } else {

   
    const monthlyPrincipal = principalAmount / durationMonths;

    for (let i = 1; i <= durationMonths; i++) {
      schedules.push({
        customer_id,
        amount: monthlyPrincipal,         
        payment_date: iso(getMonthlyPayoutDate(first, i - 1, basePayoutDay)),
        payment_type: 'Monthly',
        is_paid: false,
        is_principal: i === durationMonths,  
        principal_amount: i === durationMonths ? principalAmount : 0,
        interest_amount: monthlyPrincipal,   
        start_date: start,
        payout_month: i,
        });
      }
    }

  } else if (plan.segment === 'PRE-IPO') {
    if (plan.payment_type === 'Buyback') {
      
      const totalInterest = amount * ((plan.return_percentage || 0) / 100);
      schedules.push({
        customer_id,
        amount: parseFloat((amount + totalInterest).toFixed(2)),
        payment_date: iso(getMonthlyPayoutDate(first, duration, basePayoutDay)),
        payment_type: 'Buyback',
        is_paid: false,
        is_principal: true,
        principal_amount: amount,
        interest_amount: parseFloat(totalInterest.toFixed(2)),
        start_date: start,
        payout_month: 1,
      });
    } else {
      
      const monthlyInterest = amount * ((plan.return_percentage || 0) / 100);

      for (let i = 1; i <= duration; i++) {
        schedules.push({
          customer_id,
          amount: parseFloat(monthlyInterest.toFixed(2)),
          payment_date: iso(getMonthlyPayoutDate(first, i - 1, basePayoutDay)),
          payment_type: 'Monthly',
          is_paid: false,
          is_principal: false, 
          principal_amount: 0,
          interest_amount: parseFloat(monthlyInterest.toFixed(2)),
          start_date: start,
          payout_month: i,
        });
      }
     
    }

  } else if (plan.segment === 'DIRECT') {
    if (plan.payment_type === 'Buyback') {
      
      const totalInterest = amount * ((plan.return_percentage || 0) / 100);
      schedules.push({
        customer_id,
        amount: parseFloat((amount + totalInterest).toFixed(2)),
        payment_date: iso(getMonthlyPayoutDate(first, duration, basePayoutDay)),
        payment_type: 'Buyback',
        is_paid: false,
        is_principal: true,
        principal_amount: amount,
        interest_amount: parseFloat(totalInterest.toFixed(2)),
        start_date: start,
        payout_month: 1,
      });
    } else {
     
      // const monthlyInterest = amount * ((plan.return_percentage || 0) / 100);

      // for (let i = 1; i <= duration; i++) {
      //   const isLast = i === duration;
      //   schedules.push({
      //     customer_id,
      //     amount: parseFloat((isLast ? monthlyInterest + amount : monthlyInterest).toFixed(2)),
      //     payment_date: iso(getMonthlyPayoutDate(first, i - 1, basePayoutDay)),
      //     payment_type: 'Monthly',
      //     is_paid: false,
      //     is_principal: isLast,
      //     principal_amount: isLast ? amount : 0,
      //     interest_amount: parseFloat(monthlyInterest.toFixed(2)),
      //     start_date: start,
      //     payout_month: i,
      //   });
      // }

//       const monthlyInterest = amount * ((plan.return_percentage || 0) / 100);

// for (let i = 1; i <= duration; i++) {
//   schedules.push({
//     customer_id,
//     amount: parseFloat(monthlyInterest.toFixed(2)), // ONLY interest
//     payment_date: iso(getMonthlyPayoutDate(first, i - 1, basePayoutDay)),
//     payment_type: 'Monthly',
//     is_paid: false,
//     is_principal: false,         
//     principal_amount: 0,          
//     interest_amount: parseFloat(monthlyInterest.toFixed(2)),
//     start_date: start,
//     payout_month: i,
//   });
// }

const monthlyInterest = amount * ((plan.return_percentage || 0) / 100);


if (duration === 11) {
 
  for (let i = 1; i <= duration; i++) {
    schedules.push({
      customer_id,
      amount: parseFloat(monthlyInterest.toFixed(2)),
      payment_date: iso(getMonthlyPayoutDate(first, i - 1, basePayoutDay)),
      payment_type: 'Monthly',
      is_paid: false,

      is_principal: false,
      principal_amount: 0,
      interest_amount: parseFloat(monthlyInterest.toFixed(2)),

      start_date: start,
      payout_month: i,
    });
  }
} else {
  
  for (let i = 1; i <= duration; i++) {
    const isLast = i === duration;

    schedules.push({
      customer_id,
      amount: parseFloat(
        (isLast ? monthlyInterest + amount : monthlyInterest).toFixed(2)
      ),
      payment_date: iso(getMonthlyPayoutDate(first, i - 1, basePayoutDay)),
      payment_type: 'Monthly',
      is_paid: false,

      is_principal: isLast,
      principal_amount: isLast ? amount : 0,
      interest_amount: parseFloat(monthlyInterest.toFixed(2)),

      start_date: start,
      payout_month: i,
    });
  }
}

    }

 
  // TRAVEL 

  } else if (plan.segment === 'TRAVEL') {
   
if (plan.payment_type === 'Buyback') {

    const totalInterest = amount * ((plan.return_percentage || 0) / 100);

    schedules.push({
      customer_id,
      amount: parseFloat((amount + totalInterest).toFixed(2)),
      payment_date: iso(getMonthlyPayoutDate(first, duration, basePayoutDay)),
      payment_type: 'Buyback',
      is_paid: false,
      is_principal: true,
      principal_amount: amount,
      interest_amount: parseFloat(totalInterest.toFixed(2)),
      start_date: start,
      payout_month: 1,
    });

  } 
  
  
  else {

   const intervalMonths = 6;
  const totalPayments = Math.ceil(duration / intervalMonths);

  const yearlyInterest = amount * ((plan.return_percentage || 0) / 100);
  const sixMonthInterest = yearlyInterest / 2;

  for (let i = 1; i <= totalPayments; i++) {
    const isLast = i === totalPayments;

    // +6, +12, +18... FROM INVESTMENT MONTH
    const monthsToAdd = i * intervalMonths;

    schedules.push({
      customer_id,
      amount: parseFloat(
        (isLast ? sixMonthInterest + amount : sixMonthInterest).toFixed(2)
      ),
      payment_date: iso(
        getMonthlyPayoutDate(base, monthsToAdd, basePayoutDay)
      ),
      payment_type: '6-Month-Interval',
      is_paid: false,
      is_principal: isLast,
      principal_amount: isLast ? amount : 0,
      interest_amount: parseFloat(sixMonthInterest.toFixed(2)),
      start_date: start,
      payout_month: monthsToAdd,
    });
    }
  }
 
  } else if (plan.segment === 'INVESTMENT') {
    

    if (plan.payment_type === 'Buyback') {

    const totalInterest = amount * ((plan.return_percentage || 0) / 100);

    schedules.push({
      customer_id,
      amount: parseFloat((amount + totalInterest).toFixed(2)),   
      payment_date: iso(getMonthlyPayoutDate(first, duration, basePayoutDay)),
      payment_type: 'Buyback',
      is_paid: false,
      is_principal: true,
      principal_amount: amount,
      interest_amount: parseFloat(totalInterest.toFixed(2)),
      start_date: start,
      payout_month: 1,
    });

  } else {
   
    const monthlyInterest = amount * ((plan.return_percentage || 0) / 100);

    for (let i = 1; i <= duration; i++) {
      schedules.push({
        customer_id,
        amount: parseFloat(monthlyInterest.toFixed(2)), 
        payment_date: iso(getMonthlyPayoutDate(first, i - 1, basePayoutDay)),
        payment_type: 'Monthly',
        is_paid: false,
        is_principal: false,     
        principal_amount: 0,
        interest_amount: parseFloat(monthlyInterest.toFixed(2)),
        start_date: start,
        payout_month: i,
      });
    }
  }

  
  } 
else if (plan.segment === 'REAL ESTATE') {
    if (plan.payment_type === 'Buyback') {
      
      const totalInterest = amount * ((plan.return_percentage || 0) / 100);
      schedules.push({
        customer_id,
        amount: parseFloat((amount + totalInterest).toFixed(2)),
        payment_date: iso(getMonthlyPayoutDate(first, duration, basePayoutDay)),
        payment_type: 'Buyback',
        is_paid: false,
        is_principal: true,
        principal_amount: amount,
        interest_amount: parseFloat(totalInterest.toFixed(2)),
        start_date: start,
        payout_month: 1,
      });
    } else {
      
      const monthlyInterest = amount * ((plan.return_percentage || 0) / 100);

      for (let i = 1; i <= duration; i++) {
        schedules.push({
          customer_id,
          amount: parseFloat(monthlyInterest.toFixed(2)),
          payment_date: iso(getMonthlyPayoutDate(first, i - 1, basePayoutDay)),
          payment_type: 'Monthly',
          is_paid: false,
          is_principal: false, 
          principal_amount: 0,
          interest_amount: parseFloat(monthlyInterest.toFixed(2)),
          start_date: start,
          payout_month: i,
        });
      }
      
    }
  }  
  else {
   
    if (plan.payment_type === 'Buyback') {
      const totalReturn = amount * ((plan.return_percentage || 0) / 100) * (duration / 12);
      schedules.push({
        customer_id,
        amount: parseFloat((amount + totalReturn).toFixed(2)),
        payment_date: iso(getMonthlyPayoutDate(first, duration, basePayoutDay)),
        payment_type: 'Buyback',
        is_paid: false,
        is_principal: true,
        principal_amount: amount,
        interest_amount: parseFloat(totalReturn.toFixed(2)),
        start_date: start,
        payout_month: 1,
      });
    } else {
     
      const monthlyInterest = (amount * ((plan.return_percentage || 0) / 100)) / 12;
      for (let i = 1; i <= duration; i++) {
        const isLast = i === duration;
        schedules.push({
          customer_id,
          amount: parseFloat((isLast ? monthlyInterest + amount : monthlyInterest).toFixed(2)),
          payment_date: iso(getMonthlyPayoutDate(first, i - 1, basePayoutDay)),
          payment_type: 'Monthly',
          is_paid: false,
          is_principal: isLast,
          principal_amount: isLast ? amount : 0,
          interest_amount: parseFloat(monthlyInterest.toFixed(2)),
          start_date: start,
          payout_month: i,
        });
      }
    }
  }

  // Persist and audit
  const data = await PaymentSchedule.insertMany(schedules);
  await auditLog('payment_schedules', customer_id, 'GENERATE_SCHEDULE', null, { count: data.length, first_payment: start }, null);
  return data;
}








async function generateAgentPayments(customer_id, direct_agent_id, amount, approved_at) {
  const payments = [];
  const approvedDate = new Date(approved_at);
  const payment_date = approvedDate.toISOString().split('T')[0]; // SAME MONTH

  let current_agent = await Agent.findById(direct_agent_id);
  if (!current_agent || current_agent.approval_status !== 'approved') return [];

  let prev_commission = 0;

  while (current_agent) {
    const current_commission = current_agent.commission_percentage || 0;

    
    if (current_commission > prev_commission) {
      const payable = (amount * (current_commission - prev_commission)) / 100;
      payments.push({
        agent_id: current_agent._id,
        customer_id,
        amount: payable,
        payment_date,
        is_paid: false,
        created_at: new Date(),
      });
    }

    // Stop if no parent
    if (!current_agent.parent_agent_id) break;

    // Move to parent
    const parent = await Agent.findById(current_agent.parent_agent_id);
    if (!parent || parent.approval_status !== 'approved') break;

    prev_commission = current_commission;
    current_agent = parent;
  }

  if (payments.length > 0) {
    const data = await AgentPayment.insertMany(payments);
    await auditLog(
      'agent_payments',
      customer_id,
      'GENERATE_PAYMENTS',
      null,
      { count: data.length, payment_date },
      null
    );
    return data;
  }

  return [];
}

// ------------------- AGENT REWARDS -------------------


async function generateAgentRewards() {
  

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Month range
  const monthStart = new Date(year, month, 1).toISOString().split("T")[0];
  const monthEnd   = new Date(year, month + 1, 0).toISOString().split("T")[0];
  const monthStr   = today.toISOString().slice(0, 7); // YYYY-MM

  const agents    = await Agent.find({});
  const giftPlans = await GiftPlan.find({ is_active: true });

  for (const agent of agents) {
    const rewardExists = await AgentReward.findOne({
      agent_id: agent._id,
      performance_month: monthStr,
    });

    if (rewardExists) continue;

    const customers = await Customer.find({
      agent_id: agent._id,
      approval_status: "approved",
      investment_date: { $gte: monthStart, $lte: monthEnd },
    });

    const achievedAmount = customers.reduce(
      (sum, c) => sum + (c.investment_amount || 0),
      0
    );

    const matchedPlan = giftPlans.find(
      (plan) => achievedAmount >= (plan.target_amount || 0)
    );

    if (matchedPlan) {
      await AgentReward.create({
        agent_id: agent._id,
        gift_plan_id: matchedPlan._id,
        performance_month: monthStr,
        achieved_investors: customers.length,
        achieved_amount: achievedAmount,
        is_rewarded: false,
      });

      console.log(`Reward created for Agent: ${agent._id}`);
    }
  }

  console.log("Agent Reward Generation Completed.");
}



async function generateInvestmentPaymentOnApproval(inv) {
  if (!inv.duration_months) {
    throw new Error("duration_months is required");
  }
  if (inv.return_percentage === undefined || inv.return_percentage === null) {
    throw new Error("return_percentage is required");
  }

  const startDate = new Date(inv.investment_date);

  
  const monthlyRate = inv.return_percentage / 100;

  
  const monthlyInterest = inv.investment_amount * monthlyRate;

  const schedule = [];

  for (let m = 1; m <= inv.duration_months; m++) {
    const payment_date = addMonths(startDate, m).toISOString().split("T")[0];

    schedule.push({
      investment_id: inv._id,

      amount: parseFloat(monthlyInterest.toFixed(2)),
      interest_amount: parseFloat(monthlyInterest.toFixed(2)),
      principal_amount: 0,

      payment_type: "Monthly",
      payout_cycle: m,

      payment_date,
      is_paid: false,
      created_at: new Date(),
    });
  }

  const payments = await InvestmentPayment.insertMany(schedule);

  await auditLog(
    "investment_payments",
    inv._id,
    "AUTO_GENERATE_MONTHLY_PAYMENTS",
    null,
    { monthlyInterest, months: inv.duration_months },
    "system"
  );

  return payments;
}





function monthsDiff(startDate, endDate) {
  const sy = startDate.getFullYear(), sm = startDate.getMonth();
  const ey = endDate.getFullYear(), em = endDate.getMonth();
  return (ey - sy) * 12 + (em - sm);
}


// ------------------- EXCEL EXPORT -------------------
async function exportToExcel(data, columns, filename) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Export');
  ws.columns = columns;
  ws.addRows(data);
  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer, filename };
}

// ------------------- CLEANUP CRON -------------------
cron.schedule('0 0 * * *', async () => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await Customer.deleteMany({
    approval_status: 'rejected',
    updated_at: { $lte: twentyFourHoursAgo },
  });
  await CompanyInvestment.deleteMany({
    approval_status: 'rejected',
    updated_at: { $lte: twentyFourHoursAgo },
  });
  await auditLog('cleanup', null, 'DELETE_REJECTED', null, {}, null);
});

// ------------------- EXPRESS APP -------------------
const app = express();
app.use(helmet());
app.use(cors());
// const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
// app.use(cors({
//   origin: (origin, callback) => {
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
// }));

app.use(express.json({ limit: '10mb' }));
// app.use('/uploads', express.static(uploadDir));
app.use('/uploads', express.static(uploadDir, {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    // Optionally allow caching (adjust as you need)
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

app.use('/auth', authLimiter);

// ------------------- MIDDLEWARE -------------------
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token)
    return res
      .status(401)
      .json({ data: null, error: { code: 'UNAUTHORIZED', message: 'No token' } });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res
      .status(401)
      .json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }
};

const rbacMiddleware = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res
      .status(403)
      .json({ data: null, error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
  next();
};

// ------------------- DATABASE SEEDING -------------------
async function setupDatabase() {
  try {
    const adminExists = await Profile.findOne({ email: process.env.SUPER_ADMIN_EMAIL || 'ritikmahakalkar16@gmail.com' });
    if (!adminExists) {
      await Profile.create({
        user_id: uuidv4(),
        email: process.env.SUPER_ADMIN_EMAIL || 'ritikmahakalkar16@gmail.com',
        first_name: process.env.SUPER_ADMIN_FIRST_NAME || 'Ritik',
        last_name: process.env.SUPER_ADMIN_LAST_NAME || 'Mahakalkar',
        role: process.env.SUPER_ADMIN_ROLE ||'super_admin',
        active: true,
      });
      console.log('Seeded super_admin profile');
    }

    const plansCount = await Plan.countDocuments();
    if (plansCount === 0) {
      const samplePlans = [
        {
          name: 'PRE-IPO  Monthely',
          segment: 'PRE-IPO',
          investment_amount: 500000,
          duration_months: 30,
          return_percentage: 2.5,
          payment_type: 'Monthly',
          is_active: true,
        },
        {
          name: 'Real Estate Buyback',
          segment: 'REAL ESTATE',
          investment_amount: 500000,
          duration_months: 36,
          return_percentage: 100,
          payment_type: 'Buyback',
          is_active: true,
        },
        {
          name: 'Direct Investment',
          segment: 'DIRECT',
          investment_amount: 500000,
          duration_months: 12,
          return_percentage: 4,
          payment_type: 'Monthly',
          is_active: true,
        },
        {
          name: 'INFRA PLAN A Monthly',
          segment: 'INFRASTRUCTURE',
          duration_months: 12,
          discount_percentage: 20,
          payment_type: 'Monthly',
          is_active: true,
        },
      ];
      await Plan.insertMany(samplePlans);
      console.log('Seeded sample plans');
    }
  } catch (error) {
    console.error('Seeding error:', error);
  }
}

// ------------------- AUTH ROUTES -------------------
async function sendOTP(email) {
  const profile = await Profile.findOne({ email });
  if (!profile) throw new Error('Email not found');

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = await hashPassword(otp);
  await OtpToken.create({ email, hashed_otp: hashedOtp });

  // await transporter.sendMail({
  //   from: GMAIL_EMAIL,
  //   to: email,
  //   subject: 'Elite Wealth OTP',
  //   html: `<h1>Elite Wealth OTP</h1><p>Your OTP is <strong>${otp}</strong>.</p>`,
  // });
  await transporter.sendMail({
  from: `"Elite Wealth" <${GMAIL_EMAIL}>`,
  to: email,
  subject: "Your Elite Wealth OTP Code",
  html: `
    <!-- Optional doctype for better HTML email rendering -->
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Elite Wealth OTP</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f7fb;">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:auto; background:#f4f7fb; padding:25px;">
        <tr>
          <td align="center">
            <!-- Logo -->
            <img src="https://elitewealthfx.com/Logo_bg.png"
                 alt="Elite Wealth Logo"
                 width="200"
                 style="display:block; margin:0 auto 20px auto; border:0;" />
          </td>
        </tr>
        <tr>
          <td style="
            background: white;
            padding: 30px;
            border-radius: 8px;
            border: 1px solid #e3e9f1;
            font-family: Arial, sans-serif;
          ">
            <p style="font-size: 16px; color: #333; margin:0 0 10px 0;">
              Dear User,
            </p>
            <p style="font-size: 15px; color: #555; line-height:1.5; margin:0 0 20px 0;">
              Use the OTP below to complete your login. 
            </p>
            <h1 style="
              font-size: 40px;
              letter-spacing: 8px;
              text-align: center;
              color: #1f4e79;
              margin: 20px 0;
            ">
              ${otp}
            </h1>
            <p style="font-size: 14px; color: #777; text-align: center; margin:0;">
              Do not share this OTP with anyone for security reasons.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top: 20px; font-family: Arial, sans-serif; font-size:12px; color:#999;">
            © ${new Date().getFullYear()} Elite Wealth. All rights reserved.
          </td>
        </tr>
      </table>
    </body>
    </html>
  `,
});

}

app.post('/auth/sessions', async (req, res) => {
  try {
    const { email } = ProfileCreateSchema.pick({ email: true }).parse(req.body);
    await sendOTP(email);
    res.json({ data: { success: true }, error: null });
  } catch (error) {
    res
      .status(400)
      .json({ data: null, error: { code: 'AUTH_ERROR', message: error.message } });
  }
});

// ------------------- RESEND OTP (WITH FULL sendOTP LOGIC) -------------------
app.post(
  '/auth/resend-session',
  authLimiter, 
  async (req, res) => {
    try {
      const { email } = ProfileCreateSchema.pick({ email: true }).parse(req.body);

     
      const profile = await Profile.findOne({ email });
      if (!profile) {
        return res.status(404).json({
          data: null,
          error: { code: 'EMAIL_NOT_FOUND', message: 'Email not registered' },
        });
      }

      if (!profile.active) {
        return res.status(403).json({
          data: null,
          error: { code: 'ACCOUNT_INACTIVE', message: 'Account is deactivated' },
        });
      }

      // Delete any existing OTP
      await OtpToken.deleteOne({ email });

      // Generate new OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await hashPassword(otp);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Save new OTP
      await OtpToken.create({
        email,
        hashed_otp: hashedOtp,
        expires_at: expiresAt,
      });

      

      await transporter.sendMail({
  from: `"Elite Wealth" <${GMAIL_EMAIL}>`,
  to: email,
  subject: "Elite Wealth - Your OTP Code",
  html: `
    <!DOCTYPE html>
    <html>
    <body style="margin:0; padding:0; background:#f4f7fb;">

      <table align="center" cellpadding="0" cellspacing="0" width="100%" 
        style="max-width:600px; margin:auto; padding:20px;">

        <tr>
          <td align="center">
            <img src="https://elitewealthfx.com/Logo_bg.png"
                 alt="Elite Wealth Logo"
                 width="180"
                 style="display:block; margin:0 auto 20px auto;" />
          </td>
        </tr>

        <tr>
          <td style="
            background:white; 
            padding:25px; 
            border-radius:10px; 
            border:1px solid #d9e3f0; 
            font-family:Arial, sans-serif;
          ">
            <h2 style="color:#1f4e79; margin-top:0;">Elite Wealth</h2>

            <p>Hello <strong>${profile.first_name || "User"}</strong>,</p>

            <p>Your new OTP is:</p>

            <h1 style="
              font-size:36px; 
              letter-spacing:6px; 
              color:#1f4e79; 
              text-align:center; 
              margin:25px 0;
            ">
              ${otp}
            </h1>

            <p>This OTP is valid for <strong>5 minutes</strong>.</p>
            <p>If you didn’t request this, please ignore this email.</p>

            <hr style="margin:25px 0; border:0; border-top:1px solid #eee;">

            <p style="color:#888; font-size:12px; text-align:center;">
              © ${new Date().getFullYear()} Elite Wealth. All rights reserved.
            </p>
          </td>
        </tr>

      </table>

    </body>
    </html>
  `,
});


      // Audit log
      await auditLog('auth', email, 'RESEND_OTP', null, { success: true }, null);

      
      res.json({
        data: {
          success: true,
          message: 'OTP sent successfully to your email',
          expires_in: '5 minutes',
        },
        error: null,
      });
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          data: null,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' },
        });
      }

      console.error('Resend OTP Error:', error);
      await auditLog('auth', req.body.email || 'unknown', 'RESEND_OTP_FAILED', null, { error: error.message }, null);

      res.status(500).json({
        data: null,
        error: { code: 'RESEND_FAILED', message: 'Failed to resend OTP. Please try again.' },
      });
    }
  }
);

app.post('/auth/login', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const tokenData = await OtpToken.findOne({ email });
    if (!tokenData || !(await bcrypt.compare(otp, tokenData.hashed_otp))) {
      throw new Error('Invalid OTP');
    }

    const user = await Profile.findOne({ email });
    if (!user.active) throw new Error('Account is deactivated');
    const token = generateToken({
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    });
    await OtpToken.deleteOne({ email });

    res.json({
      data: {
        token,
        user: { user_id: user.user_id, email: user.email, role: user.role },
      },
      error: null,
    });
  } catch (error) {
    res
      .status(400)
      .json({ data: null, error: { code: 'AUTH_ERROR', message: error.message } });
  }
});


// ------------------- LOGOUT API -------------------
app.post('/auth/logout', authMiddleware, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(400).json({
        data: null,
        error: { code: 'BAD_REQUEST', message: 'No token provided' },
      });
    }

    // Blacklist the token 
    tokenBlacklist.add(token);

    
    const decoded = jwt.decode(token);
    if (decoded?.exp) {
      const timeLeft = (decoded.exp * 1000) - Date.now();
      if (timeLeft > 0) {
        setTimeout(() => tokenBlacklist.delete(token), timeLeft);
      }
    }

    // Audit logout
    await auditLog(
      'auth',
      req.user.user_id,
      'LOGOUT',
      null,
      { message: 'User logged out' },
      req.user.user_id
    );

    res.json({
      data: { success: true, message: 'Logged out successfully' },
      error: null,
    });
  } catch (error) {
    res.status(500).json({
      data: null,
      error: { code: 'LOGOUT_ERROR', message: 'Logout failed' },
    });
  }
});




app.get('/auth/profile', authMiddleware, async (req, res) => {
  try {
    const data = await Profile.findOne({ user_id: req.user.user_id });
    res.json({ data, error: null });
  } catch (error) {
    res
      .status(400)
      .json({ data: null, error: { code: 'PROFILE_ERROR', message: error.message } });
  }
});

// ------------------- PROFILES -------------------
app.get('/profiles', authMiddleware, async (req, res) => {
  try {
    const { page = 1, page_size = 20, search } = req.query;
    const query = search ? { email: { $regex: search, $options: 'i' } } : {};
    const total = await Profile.countDocuments(query);
    const data = await Profile.find(query)
      .skip((page - 1) * page_size)
      .limit(Math.min(page_size, 100))
      .sort({ created_at: -1 });
    res.json({ data: { items: data, total }, error: null });
  } catch (error) {
    res
      .status(400)
      .json({ data: null, error: { code: 'PROFILE_ERROR', message: error.message } });
  }
});

app.post(
  '/profiles',
  authMiddleware,
  rbacMiddleware(['super_admin']),
  async (req, res) => {
    try {
      const validated = ProfileCreateSchema.parse(req.body);
      const user_id = uuidv4();
      const data = await Profile.create({
        ...validated,
        user_id,
        created_at: new Date(),
        updated_at: new Date(),
      });
      await auditLog(
        'profiles',
        data._id,
        'CREATE',
        null,
        data.toObject(),
        req.user.user_id
      );
      res.json({ data, error: null });
    } catch (error) {
      res
        .status(400)
        .json({ data: null, error: { code: 'VALIDATION_ERROR', message: error.message } });
    }
  }
);

app.patch('/profiles/:user_id', authMiddleware, async (req, res) => {
  try {
    if (
      req.user.role !== 'super_admin' &&
      req.params.user_id !== req.user.user_id
    ) {
      throw new Error('Not authorized');
    }
    if (req.params.user_id === req.user.user_id && req.body.active === false) {
      throw new Error('Cannot deactivate self');
    }
    const oldData = await Profile.findOne({ user_id: req.params.user_id });
    const data = await Profile.findOneAndUpdate(
      { user_id: req.params.user_id },
      { ...req.body, updated_at: new Date() },
      { new: true }
    );
    await auditLog(
      'profiles',
      data._id,
      'UPDATE',
      oldData?.toObject(),
      data.toObject(),
      req.user.user_id
    );
    res.json({ data, error: null });
  } catch (error) {
    res
      .status(400)
      .json({ data: null, error: { code: 'VALIDATION_ERROR', message: error.message } });
  }
});



app.get('/customers', authMiddleware, async (req, res) => {
  try {
    const { status, plan_id, agent_id, search } = req.query;

    const query = {};
    if (status) query.approval_status = status;
    if (plan_id) query.plan_id = plan_id;
    if (agent_id) query.agent_id = agent_id;
    if (search) query.email = { $regex: search, $options: 'i' };

    const total = await Customer.countDocuments(query);

   
    let data = await Customer.find(query).sort({ created_at: -1 });

    data = await Promise.all(
      data.map((item) => maskPII(item.toObject(), req.user.role))
    );

    res.json({ data: { items: data, total }, error: null });
  } catch (error) {
    res.status(400).json({
      data: null,
      error: { code: 'CUSTOMER_ERROR', message: error.message },
    });
  }
});




app.post(
  '/customers',
  authMiddleware,
  rbacMiddleware(['office_staff', 'manager', 'super_admin']),
  upload.array('files'),
  async (req, res) => {
    try {
      const rawData = JSON.parse(req.body.data || '{}');
      const validated = CustomerCreateSchema.parse(rawData);
      const images = req.files ? await uploadImages(req.files) : [];

      
      const finalInvestmentDate = validated.investment_date && validated.investment_date.trim() !== ''
        ? validated.investment_date
        : new Date().toISOString().split('T')[0];

      const data = await Customer.create({
        ...validated,
        images,
        submitted_by: req.user.user_id,
        created_at: new Date(),
        updated_at: new Date(),

      
        investment_date: finalInvestmentDate,

       
        return_method: validated.return_method || 'Bank'
      });

      await auditLog(
        'customers',
        data._id,
        'CREATE',
        null,
        data.toObject(),
        req.user.user_id
      );

      res.json({ data, error: null });
    } catch (error) {
      console.error('Customer creation error:', error);
      res.status(400).json({
        data: null,
        error: { code: 'VALIDATION_ERROR', message: error.message || 'Invalid data' }
      });
    }
  }
);

app.post(
  '/customers/:id/approve',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      const { comments } = req.body;
      const oldData = await Customer.findById(req.params.id);
      if (!oldData) throw new Error('Customer not found');
      const data = await Customer.findByIdAndUpdate(
        req.params.id,
        {
          approval_status: 'approved',
          reviewed_by: req.user.user_id,
          review_comments: comments,
          approved_at: new Date(),
          updated_at: new Date(),
        },
        { new: true }
      );

      const plan = await Plan.findById(data.plan_id);
      if (plan) {
        await generatePaymentSchedule(
          data._id,
          data.investment_amount,
          data.investment_date || data.created_at,
          plan
        );
        if (data.agent_id) {
          await generateAgentPayments(
            data._id,
            data.agent_id,
            data.investment_amount,
            data.approved_at
          );
          // await generateAgentRewards(
          //   data._id,
          //   data.agent_id,
          //   data.investment_amount,
          //   data.approved_at
          // );
          await generateAgentBonus(
  data._id,
  data.agent_id,
  data.investment_amount,
  data.approved_at
);
        }
      }

      await auditLog(
        'customers',
        data._id,
        'APPROVE',
        oldData?.toObject(),
        data.toObject(),
        req.user.user_id
      );
      res.json({ data: { success: true, updated: data }, error: null });
    } catch (error) {
      res
        .status(400)
        .json({ data: null, error: { code: 'APPROVAL_ERROR', message: error.message } });
    }
  }
);

app.post(
  '/customers/:id/reject',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      const { comments } = req.body;
      const oldData = await Customer.findById(req.params.id);
      if (!oldData) throw new Error('Customer not found');
      const data = await Customer.findByIdAndUpdate(
        req.params.id,
        {
          approval_status: 'rejected',
          reviewed_by: req.user.user_id,
          review_comments: comments,
          updated_at: new Date(),
        },
        { new: true }
      );
      await auditLog(
        'customers',
        data._id,
        'REJECT',
        oldData?.toObject(),
        data.toObject(),
        req.user.user_id
      );
      res.json({ data: { success: true, updated: data }, error: null });
    } catch (error) {
      res
        .status(400)
        .json({ data: null, error: { code: 'APPROVAL_ERROR', message: error.message } });
    }
  }
);

app.patch(
  '/customers/:id',
  authMiddleware,
  rbacMiddleware(['office_staff', 'manager', 'super_admin']),
  upload.array('files'),
  async (req, res) => {
    try {
      const validated = CustomerCreateSchema.partial().parse(
        JSON.parse(req.body.data || '{}')
      );
      const oldData = await Customer.findById(req.params.id);
      if (!oldData) throw new Error('Customer not found');
      const newImages = req.files ? await uploadImages(req.files) : [];
      const images = [...(oldData.images || []), ...newImages];
      const updateData = {
        ...validated,
        images,
        nominee: validated.nominee ?? oldData.nominee,
        nominee_adhar_pan_number:
          validated.nominee_adhar_pan_number ?? oldData.nominee_adhar_pan_number,
        email: validated.email ?? oldData.email,
        phone: validated.phone ?? oldData.phone,
        updated_at: new Date(),
      };
      const data = await Customer.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );
      await auditLog(
        'customers',
        data._id,
        'UPDATE',
        oldData.toObject(),
        data.toObject(),
        req.user.user_id
      );
      res.json({ data, error: null });
    } catch (error) {
      res
        .status(400)
        .json({ data: null, error: { code: 'VALIDATION_ERROR', message: error.message } });
    }
  }
);



// ------------------- SETTLE CUSTOMER -------------------
app.post(
  '/customers/:id/settle',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Find the customer
      const customer = await Customer.findById(id);
      if (!customer) {
        return res.status(404).json({
          data: null,
          error: { code: 'NOT_FOUND', message: 'Customer not found' },
        });
      }

      // Prevent double-settling
      if (customer.approval_status === 'settled') {
        return res.status(400).json({
          data: null,
          error: { code: 'ALREADY_SETTLED', message: 'Customer is already settled' },
        });
      }

      // Update customer status
      const oldCustomer = customer.toObject();
      customer.approval_status = 'settled';
      customer.updated_at = new Date();
      await customer.save();

      //  Mark all payment schedules as paid 
      const updateResult = await PaymentSchedule.updateMany(
        { customer_id: id },
        {
          $set: {
            is_paid: true,
            paid_at: new Date(),
            payment_method: 'none',
          },
        }
      );

      // Audit log
      await auditLog(
        'customers',
        customer._id,
        'SETTLE',
        oldCustomer,
        customer.toObject(),
        req.user.user_id
      );

      // Response
      res.json({
        data: {
          success: true,
          customer: {
            _id: customer._id,
            approval_status: customer.approval_status,
          },
          payments_updated: updateResult.modifiedCount,
        },
        error: null,
      });
    } catch (error) {
      console.error('Settle customer error:', error);
      res.status(500).json({
        data: null,
        error: { code: 'SETTLE_ERROR', message: error.message },
      });
    }
  }
);

app.get(
  "/customers/unique",
  authMiddleware,
  rbacMiddleware(["manager", "super_admin"]),
  async (req, res) => {
    try {
      const customers = await Customer.aggregate([
        {
          $project: {
            first_name: { $ifNull: ["$first_name", ""] },
            last_name: { $ifNull: ["$last_name", ""] },
            email: { $ifNull: ["$email", ""] },
            phone: { $ifNull: ["$phone", ""] },
            address: { $ifNull: ["$address", ""] },
            pan_number: { $ifNull: ["$pan_number", ""] },
            aadhar_number: { $ifNull: ["$aadhar_number", ""] },
            bank_name: { $ifNull: ["$bank_name", ""] },
            account_number: { $ifNull: ["$account_number", ""] },
            ifsc_code: { $ifNull: ["$ifsc_code", ""] },
            branch: { $ifNull: ["$branch", ""] },
            nominee: { $ifNull: ["$nominee", ""] },
            nominee_adhar_pan_number: {
              $ifNull: ["$nominee_adhar_pan_number", ""]
            },
            created_at: 1
          }
        },
        {
          $group: {
            _id: {
              first_name: "$first_name",
              last_name: "$last_name",
              email: "$email",
              phone: "$phone",
              address: "$address",
              pan_number: "$pan_number",
              aadhar_number: "$aadhar_number",
              bank_name: "$bank_name",
              account_number: "$account_number",
              ifsc_code: "$ifsc_code",
              branch: "$branch",
              nominee: "$nominee",
              nominee_adhar_pan_number: "$nominee_adhar_pan_number"
            },
            created_at: { $min: "$created_at" }
          }
        },
        {
          $project: {
            _id: 0,
            customer_key: {
              $toLower: {
                $concat: [
                  "$_id.first_name","|",
                  "$_id.last_name","|",
                  "$_id.email","|",
                  "$_id.phone","|",
                  "$_id.pan_number","|",
                  "$_id.aadhar_number"
                ]
              }
            },
            first_name: "$_id.first_name",
            last_name: "$_id.last_name",
            full_name: {
              $trim: {
                input: { $concat: ["$_id.first_name"," ","$_id.last_name"] }
              }
            },
            email: "$_id.email",
            phone: "$_id.phone",
            address: "$_id.address",
            pan_number: "$_id.pan_number",
            aadhar_number: "$_id.aadhar_number",
            bank_details: {
              bank_name: "$_id.bank_name",
              account_number: "$_id.account_number",
              ifsc_code: "$_id.ifsc_code",
              branch: "$_id.branch"
            },
            nominee_name: "$_id.nominee",
            nominee_pan_aadhar: "$_id.nominee_adhar_pan_number",
            created_at: "$created_at"
          }
        }
      ]);

      res.json({ data: customers, error: null });
    } catch (err) {
      console.error("Unique Customer API Error:", err);
      res.status(500).json({
        data: null,
        error: { code: "UNIQUE_CUSTOMER_ERROR", message: err.message }
      });
    }
  }
);
app.get(
  "/customers/:id",
  authMiddleware,
  rbacMiddleware(["manager", "super_admin", "office_staff"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userRole = req.user.role;

      // Find Customer 
      const customer = await Customer.findById(id)
        .select("+images") 
        .lean();

      if (!customer) {
        return res.status(404).json({
          data: null,
          error: { code: "CUSTOMER_NOT_FOUND", message: "Customer not found" },
        });
      }

      // Mask PII for office_staff 
      let safeCustomer = { ...customer };
      if (userRole === "office_staff") {
        safeCustomer = await maskPII(safeCustomer, "office_staff");
      }

      //  Fetch Payment Schedules
      const schedules = await PaymentSchedule.find({ customer_id: id })
        .sort({ payment_date: 1 })
        .lean();

      const formattedSchedules = schedules.map((s) => ({
        _id: s._id,
        amount: s.amount || 0,
        payment_date: s.payment_date,
        is_paid: s.is_paid || false,
        paid_at: s.paid_at || null,
        is_principal: s.is_principal || false,
        interest_amount: s.interest_amount || 0,
        principal_amount: s.principal_amount || 0,
        payout_month: s.payout_month || 0,
        payment_method: s.payment_method || "None",
        transaction_id: s.transaction_id || null,
        images: s.images || [], // schedule proofs
      }));

      //  Summary Stats 
      const totalInvested = safeCustomer.investment_amount || 0;
      const totalPaid = formattedSchedules
        .filter((s) => s.is_paid)
        .reduce((sum, s) => sum + s.amount, 0);
      const totalDue = formattedSchedules
        .filter((s) => !s.is_paid)
        .reduce((sum, s) => sum + s.amount, 0);

      //  Final Response
      res.json({
        data: {
          customer: {
            _id: safeCustomer._id,
            first_name: safeCustomer.first_name || null,
            last_name: safeCustomer.last_name || null,
            email: safeCustomer.email || null,
            phone: safeCustomer.phone || null,
            address: safeCustomer.address || null,
            pan_number: safeCustomer.pan_number || null,
            aadhar_number: safeCustomer.aadhar_number || null,
            bank_name: safeCustomer.bank_name || null,
            account_number: safeCustomer.account_number || null,
            ifsc_code: safeCustomer.ifsc_code || null,
            branch: safeCustomer.branch || null,
            return_method: safeCustomer.return_method || "Bank",
            nominee: safeCustomer.nominee || null,
            nominee_adhar_pan_number:
              safeCustomer.nominee_adhar_pan_number || null,
            investment_amount: safeCustomer.investment_amount || 0,
            investment_date: safeCustomer.investment_date || null,
            plan_id: safeCustomer.plan_id || null,
            approval_status: safeCustomer.approval_status || "pending",
            created_at: safeCustomer.created_at,
            updated_at: safeCustomer.updated_at,

            
            images: safeCustomer.images || [],

            
            display_name:
              `${safeCustomer.first_name || ""} ${
                safeCustomer.last_name || ""
              }`.trim() || "N/A",
          },

          payment_schedules: formattedSchedules,

          summary: {
            total_invested: totalInvested,
            total_paid: totalPaid,
            total_due: totalDue,
            total_payments: formattedSchedules.length,
            paid_count: formattedSchedules.filter((s) => s.is_paid).length,
            unpaid_count: formattedSchedules.filter((s) => !s.is_paid).length,
          },
        },
        error: null,
      });
    } catch (error) {
      console.error("Customer Details API Error:", error);
      res.status(500).json({
        data: null,
        error: { code: "CUSTOMER_DETAILS_ERROR", message: error.message },
      });
    }
  }
);


// ------------------- EXPORT ALL CUSTOMERS TO EXCEL -------------------
app.get(
  '/customers/export/excel',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      // Fetch ALL customers 
      const customers = await Customer.find({})
        .populate('plan_id', 'name segment return_percentage duration_months payment_type')
        .populate('agent_id', 'first_name last_name email phone')
        .lean();

      if (!customers || customers.length === 0) {
        return res.status(404).json({
          data: null,
          error: { code: 'NO_DATA', message: 'No customers found to export' },
        });
      }

      //  Transform data for Excel
      const rows = customers.map((c) => {
        const plan = c.plan_id || {};
        const agent = c.agent_id || {};

        return {
          'Customer ID': c._id.toString(),
          'First Name': c.first_name || '',
          'Last Name': c.last_name || '',
          'Email': c.email || '',
          'Phone': c.phone || '',
          'Address': c.address || '',
          'PAN': c.pan_number || '',
          'Aadhaar': c.aadhar_number || '',
          'Nominee': c.nominee || '',
          'Nominee Aadhaar/PAN': c.nominee_adhar_pan_number || '',
          'Investment Amount': c.investment_amount || 0,
          'Investment Date': c.investment_date || '',
          'Plan Name': plan.name || '',
          'Segment': plan.segment || '',
          'Return %': plan.return_percentage || 0,
          'Duration (Months)': plan.duration_months || 0,
          'Payment Type': plan.payment_type || '',
          'Agent Name': `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || 'N/A',
          'Agent Email': agent.email || '',
          'Agent Phone': agent.phone || '',
          'Bank Name': c.bank_name || '',
          'Account Number': c.account_number || '',
          'IFSC Code': c.ifsc_code || '',
          'Branch': c.branch || '',
          'Payable Balance': c.payable_balance_amount_by_company || 0,
          'Total Paid to Customer': c.total_paid_amount_to_customer || 0,
          'Approval Status': c.approval_status || 'pending',
          'Submitted By': c.submitted_by || '',
          'Reviewed By': c.reviewed_by || '',
          'Review Comments': c.review_comments || '',
          'Approved At': c.approved_at ? new Date(c.approved_at).toLocaleDateString() : '',
          'Created At': new Date(c.created_at).toLocaleDateString(),
          'Updated At': new Date(c.updated_at).toLocaleDateString(),
        };
      });

      //  Define Excel 
      const columns = [
        { header: 'Customer ID', key: 'Customer ID', width: 26 },
        { header: 'First Name', key: 'First Name', width: 15 },
        { header: 'Last Name', key: 'Last Name', width: 15 },
        { header: 'Email', key: 'Email', width: 25 },
        { header: 'Phone', key: 'Phone', width: 14 },
        { header: 'Address', key: 'Address', width: 30 },
        { header: 'PAN', key: 'PAN', width: 14 },
        { header: 'Aadhaar', key: 'Aadhaar', width: 16 },
        { header: 'Nominee', key: 'Nominee', width: 20 },
        { header: 'Nominee Aadhaar/PAN', key: 'Nominee Aadhaar/PAN', width: 20 },
        { header: 'Investment Amount', key: 'Investment Amount', width: 16 },
        { header: 'Investment Date', key: 'Investment Date', width: 16 },
        { header: 'Plan Name', key: 'Plan Name', width: 20 },
        { header: 'Segment', key: 'Segment', width: 12 },
        { header: 'Return %', key: 'Return %', width: 10 },
        { header: 'Duration (Months)', key: 'Duration (Months)', width: 12 },
        { header: 'Payment Type', key: 'Payment Type', width: 12 },
        { header: 'Agent Name', key: 'Agent Name', width: 20 },
        { header: 'Agent Email', key: 'Agent Email', width: 25 },
        { header: 'Agent Phone', key: 'Agent Phone', width: 14 },
        { header: 'Bank Name', key: 'Bank Name', width: 18 },
        { header: 'Account Number', key: 'Account Number', width: 18 },
        { header: 'IFSC Code', key: 'IFSC Code', width: 12 },
        { header: 'Branch', key: 'Branch', width: 16 },
        { header: 'Payable Balance', key: 'Payable Balance', width: 16 },
        { header: 'Total Paid to Customer', key: 'Total Paid to Customer', width: 20 },
        { header: 'Approval Status', key: 'Approval Status', width: 14 },
        { header: 'Submitted By', key: 'Submitted By', width: 18 },
        { header: 'Reviewed By', key: 'Reviewed By', width: 18 },
        { header: 'Review Comments', key: 'Review Comments', width: 30 },
        { header: 'Approved At', key: 'Approved At', width: 16 },
        { header: 'Created At', key: 'Created At', width: 16 },
        { header: 'Updated At', key: 'Updated At', width: 16 },
      ];

      // Generate filename with timestamp
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const filename = `customers_full_export_${timestamp}.xlsx`;

      //  Use your existing exportToExcel function
      const { buffer } = await exportToExcel(rows, columns, filename);

      // Audit log
      await auditLog(
        'customers',
        null,
        'EXPORT_EXCEL',
        null,
        { count: customers.length, filename },
        req.user.user_id
      );

      // Send file
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.send(buffer);
    } catch (error) {
      console.error('Customer Excel Export Error:', error);
      res.status(500).json({
        data: null,
        error: { code: 'EXPORT_ERROR', message: error.message },
      });
    }
  }
);
// ------------------- INVESTMENTS -------------------

app.get('/investments', authMiddleware, async (req, res) => {
  try {
    const { status, search } = req.query;

    const query = {};
    if (status) query.approval_status = status;
    if (search) query.investment_name = { $regex: search, $options: 'i' };

    const total = await CompanyInvestment.countDocuments(query);

    // Fetch all matching investments
    const data = await CompanyInvestment.find(query)
      .sort({ created_at: -1 });

    res.json({ data: { items: data, total }, error: null });
  } catch (error) {
    res.status(400).json({
      data: null,
      error: { code: 'INVESTMENT_ERROR', message: error.message },
    });
  }
});


app.post(
  '/investments',
  authMiddleware,
  rbacMiddleware(['office_staff', 'manager', 'super_admin']),
  upload.array('files'),
  async (req, res) => {
    try {
      const validated = CompanyInvestmentCreateSchema.parse(
        JSON.parse(req.body.data || '{}')
      );
      const images = req.files ? await uploadImages(req.files) : [];
      const { expected_return, return_percentage } = calculateReturnFields({
        investment_amount: validated.investment_amount,
        expected_return: validated.expected_return,
        return_percentage: validated.return_percentage,
        duration_months: validated.duration_months,
      });
      const data = await CompanyInvestment.create({
        ...validated,
        expected_return,
        return_percentage,
        images,
        submitted_by: req.user.user_id,
        created_at: new Date(),
        updated_at: new Date(),
      });
      await auditLog(
        'company_investments',
        data._id,
        'CREATE',
        null,
        data.toObject(),
        req.user.user_id
      );
      res.json({ data, error: null });
    } catch (error) {
      res
        .status(400)
        .json({ data: null, error: { code: 'VALIDATION_ERROR', message: error.message } });
    }
  }
);

app.post(
  '/investments/:id/approve',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      const { comments } = req.body;
      const oldData = await CompanyInvestment.findById(req.params.id);
      if (!oldData) throw new Error('Investment not found');
      const data = await CompanyInvestment.findByIdAndUpdate(
        req.params.id,
        {
          approval_status: 'approved',
          reviewed_by: req.user.user_id,
          review_comments: comments,
          approved_at: new Date(),
          updated_at: new Date(),
        },
        { new: true }
      );
      await generateInvestmentPaymentOnApproval(data);
      await auditLog(
        'company_investments',
        data._id,
        'APPROVE',
        oldData?.toObject(),
        data.toObject(),
        req.user.user_id
      );
      res.json({ data: { success: true, updated: data }, error: null });
    } catch (error) {
      res
        .status(400)
        .json({ data: null, error: { code: 'APPROVAL_ERROR', message: error.message } });
    }
  }
);

app.post(
  '/investments/:id/reject',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      const { comments } = req.body;
      const oldData = await CompanyInvestment.findById(req.params.id);
      if (!oldData) throw new Error('Investment not found');
      const data = await CompanyInvestment.findByIdAndUpdate(
        req.params.id,
        {
          approval_status: 'rejected',
          reviewed_by: req.user.user_id,
          review_comments: comments,
          updated_at: new Date(),
        },
        { new: true }
      );
      await auditLog(
        'company_investments',
        data._id,
        'REJECT',
        oldData?.toObject(),
        data.toObject(),
        req.user.user_id
      );
      res.json({ data: { success: true, updated: data }, error: null });
    } catch (error) {
      res
        .status(400)
        .json({ data: null, error: { code: 'APPROVAL_ERROR', message: error.message } });
    }
  }
);

app.patch(
  '/investments/:id',
  authMiddleware,
  rbacMiddleware(['office_staff', 'manager', 'super_admin']),
  upload.array('files'),
  async (req, res) => {
    try {
      const validated = CompanyInvestmentCreateSchema.partial().parse(
        JSON.parse(req.body.data || '{}')
      );
      const oldData = await CompanyInvestment.findById(req.params.id);
      if (!oldData) throw new Error('Investment not found');
      const merged = { ...oldData.toObject(), ...validated };
      const { expected_return, return_percentage } = calculateReturnFields({
        investment_amount: merged.investment_amount,
        expected_return: merged.expected_return,
        return_percentage: merged.return_percentage,
        duration_months: merged.duration_months,
      });
      const newImages = req.files ? await uploadImages(req.files) : [];
      const images = [...(oldData.images || []), ...newImages];
      const updateData = {
        ...validated,
        expected_return,
        return_percentage,
        images,
        updated_at: new Date(),
      };
      const data = await CompanyInvestment.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );
      await auditLog(
        'company_investments',
        data._id,
        'UPDATE',
        oldData.toObject(),
        data.toObject(),
        req.user.user_id
      );
      res.json({ data, error: null });
    } catch (error) {
      res
        .status(400)
        .json({ data: null, error: { code: 'VALIDATION_ERROR', message: error.message } });
    }
  }
);

app.get(
  '/investments/export',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      const investments = await CompanyInvestment.find().lean();
      const columns = [
        { header: 'ID', key: '_id' },
        { header: 'Name', key: 'investment_name' },
        { header: 'Amount', key: 'investment_amount' },
        { header: 'Expected Return', key: 'expected_return' },
        { header: 'Return %', key: 'return_percentage' },
        { header: 'Duration (mo)', key: 'duration_months' },
        { header: 'Invest Date', key: 'investment_date' },
        { header: 'Status', key: 'approval_status' },
      ];
      const { buffer, filename } = await exportToExcel(
        investments,
        columns,
        'investments.xlsx'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${filename}`
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.send(buffer);
    } catch (error) {
      res
        .status(500)
        .json({ data: null, error: { code: 'EXPORT_ERROR', message: error.message } });
    }
  }
);

// ------------------- INVESTMENT PAYMENTS -------------------


app.get(
  '/investment-payments',
  authMiddleware,
  rbacMiddleware(['super_admin']),
  async (req, res) => {
    try {
      const { investment_id } = req.query;

      const query = investment_id ? { investment_id } : {};
      const total = await InvestmentPayment.countDocuments(query);

     
      const data = await InvestmentPayment.find(query)
        .sort({ payment_date: 1 });

      const enriched = await Promise.all(
        data.map(async (p) => {
          const inv = await CompanyInvestment.findById(p.investment_id)
            .select('investment_name investment_amount');

          return {
            ...p.toObject(),
            investment_name: inv?.investment_name,
            principal: inv?.investment_amount,
            profit: p.amount - (inv?.investment_amount || 0),
          };
        })
      );

      res.json({ data: { items: enriched, total }, error: null });
    } catch (error) {
      res.status(400).json({
        data: null,
        error: {
          code: 'INVESTMENT_PAYMENT_ERROR',
          message: error.message,
        },
      });
    }
  }
);


app.patch(
  '/investment-payments/:id/mark_paid',
  authMiddleware,
  rbacMiddleware(['super_admin']),
  upload.array('files'),
  async (req, res) => {
    try {
      const { transaction_id, payment_method } = req.body;
      const images = req.files ? await uploadImages(req.files) : [];
      const oldData = await InvestmentPayment.findById(req.params.id);
      if (!oldData) throw new Error('Not found');

      const updateData = {
        is_paid: true,
        paid_at: new Date(),
        transaction_id: transaction_id || oldData.transaction_id,
        payment_method: payment_method || oldData.payment_method,
        images: [...oldData.images, ...images],
      };

      const data = await InvestmentPayment.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );
      await auditLog(
        'investment_payments',
        data._id,
        'PAYMENT_MARKED',
        oldData.toObject(),
        data.toObject(),
        req.user.user_id
      );
      res.json({ data: { success: true, updated: data }, error: null });
    } catch (error) {
      res
        .status(400)
        .json({ data: null, error: { code: 'PAYMENT_ERROR', message: error.message } });
    }
  }
);






app.get('/agents', authMiddleware, async (req, res) => {
  try {
    // Fetch ALL agents 
    let data = await Agent.find({});

    // PII masking
    data = await Promise.all(data.map(item => maskPII(item.toObject(), req.user.role)));

    
    const total = data.length;

    res.json({ data: { items: data, total }, error: null });
  } catch (error) {
    res.status(400).json({ 
      data: null, 
      error: { code: 'AGENT_ERROR', message: error.message } 
    });
  }
});
// POST /agents 
app.post('/agents', authMiddleware, rbacMiddleware(['office_staff', 'manager', 'super_admin']), upload.array('files'), async (req, res) => {
  try {
    const validated = AgentCreateSchema.parse(JSON.parse(req.body.data || '{}'));
    const images = req.files ? await uploadImages(req.files) : [];
    const data = await Agent.create({
      ...validated,
      images,
      submitted_by: req.user.user_id,
      created_at: new Date(),
      updated_at: new Date()
    });
    await auditLog('agents', data._id, 'CREATE', null, data.toObject(), req.user.user_id);
    res.json({ data, error: null });
  } catch (error) {
    res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: error.message } });
  }
});

// Approve agent
app.post('/agents/:id/approve', authMiddleware, rbacMiddleware(['manager', 'super_admin']), async (req, res) => {
  try {
    const { comments } = req.body;
    const oldData = await Agent.findById(req.params.id);
    if (!oldData) throw new Error('Agent not found');
    const data = await Agent.findByIdAndUpdate(
      req.params.id,
      {
        approval_status: 'approved',
        reviewed_by: req.user.user_id,
        review_comments: comments,
        approved_at: new Date(),
        updated_at: new Date()
      },
      { new: true }
    );
    await auditLog('agents', data._id, 'APPROVE', oldData?.toObject(), data.toObject(), req.user.user_id);
    res.json({ data: { success: true, updated: data }, error: null });
  } catch (error) {
    res.status(400).json({ data: null, error: { code: 'APPROVAL_ERROR', message: error.message } });
  }
});

// Reject agent
app.post('/agents/:id/reject', authMiddleware, rbacMiddleware(['manager', 'super_admin']), async (req, res) => {
  try {
    const { comments } = req.body;
    const oldData = await Agent.findById(req.params.id);
    if (!oldData) throw new Error('Agent not found');
    const data = await Agent.findByIdAndUpdate(
      req.params.id,
      {
        approval_status: 'rejected',
        reviewed_by: req.user.user_id,
        review_comments: comments,
        updated_at: new Date()
      },
      { new: true }
    );
    await auditLog('agents', data._id, 'REJECT', oldData?.toObject(), data.toObject(), req.user.user_id);
    res.json({ data: { success: true, updated: data }, error: null });
  } catch (error) {
    res.status(400).json({ data: null, error: { code: 'APPROVAL_ERROR', message: error.message } });
  }
});

// Update agent
app.patch('/agents/:id', authMiddleware, rbacMiddleware(['office_staff', 'manager', 'super_admin']), upload.array('files'), async (req, res) => {
  try {
    const validated = AgentCreateSchema.partial().parse(JSON.parse(req.body.data || '{}'));
    const oldData = await Agent.findById(req.params.id);
    if (!oldData) throw new Error('Agent not found');
    const newImages = req.files ? await uploadImages(req.files) : [];
    const images = [...(oldData.images || []), ...newImages];
    const updateData = { ...validated, images, updated_at: new Date() };
    const data = await Agent.findByIdAndUpdate(req.params.id, updateData, { new: true });
    await auditLog('agents', data._id, 'UPDATE', oldData.toObject(), data.toObject(), req.user.user_id);
    res.json({ data, error: null });
  } catch (error) {
    res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: error.message } });
  }
});

//  Excel
app.get('/agents/export', authMiddleware, rbacMiddleware(['manager', 'super_admin']), async (req, res) => {
  try {
    const agents = await Agent.find().lean();
    const columns = [
      { header: 'ID', key: '_id' },
      { header: 'First Name', key: 'first_name' },
      { header: 'Last Name', key: 'last_name' },
      { header: 'Email', key: 'email' },
      { header: 'Phone', key: 'phone' },
      { header: 'Address', key: 'address' },
      { header: 'PAN Number', key: 'pan_number' },
      { header: 'Agent Type', key: 'agent_type' },
      { header: 'Parent Agent ID', key: 'parent_agent_id' },
      { header: 'Commission Percentage', key: 'commission_percentage' },
      { header: 'Approval Status', key: 'approval_status' },
      { header: 'Submitted By', key: 'submitted_by' },
      { header: 'Reviewed By', key: 'reviewed_by' },
      { header: 'Review Comments', key: 'review_comments' },
      { header: 'Approved At', key: 'approved_at' },
      { header: 'Created At', key: 'created_at' },
      { header: 'Updated At', key: 'updated_at' }
    ];
    const { buffer, filename } = await exportToExcel(agents, columns, 'agents.xlsx');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ data: null, error: { code: 'EXPORT_ERROR', message: error.message } });
  }
});
// ------------------- PLANS -------------------
app.get('/plans', authMiddleware, async (req, res) => {
  try {
    const query =
      req.query.is_active === 'true' ? { is_active: true } : {};
    const data = await Plan.find(query).sort({ created_at: -1 });
    res.json({ data, error: null });
  } catch (error) {
    res
      .status(400)
      .json({ data: null, error: { code: 'PLAN_ERROR', message: error.message } });
  }
});

app.post(
  '/plans',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      const validated = PlanCreateSchema.parse(req.body);
      const data = await Plan.create({
        ...validated,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: req.user.user_id,
      });
      await auditLog(
        'plans',
        data._id,
        'CREATE',
        null,
        data.toObject(),
        req.user.user_id
      );
      res.json({ data, error: null });
    } catch (error) {
      res
        .status(400)
        .json({ data: null, error: { code: 'VALIDATION_ERROR', message: error.message } });
    }
  }
);

app.patch(
  '/plans/:id',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      const oldData = await Plan.findById(req.params.id);
      const data = await Plan.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updated_at: new Date() },
        { new: true }
      );
      if (!data) throw new Error('Plan not found');
      await auditLog(
        'plans',
        data._id,
        'UPDATE',
        oldData?.toObject(),
        data.toObject(),
        req.user.user_id
      );
      res.json({ data, error: null });
    } catch (error) {
      res
        .status(400)
        .json({ data: null, error: { code: 'VALIDATION_ERROR', message: error.message } });
    }
  }
);

// ------------------- PAYMENT SCHEDULES -------------------

app.get('/payment_schedules', authMiddleware, async (req, res) => {
  try {
    const { customer_id, status } = req.query;

    const query = {};
    if (customer_id) query.customer_id = customer_id;
    if (status) query.is_paid = status === 'paid';

    const total = await PaymentSchedule.countDocuments(query);

    // Removed skip() and limit() → fetch ALL payment schedules
    const data = await PaymentSchedule.find(query)
      .sort({ payment_date: 1 });

    res.json({ data: { items: data, total }, error: null });
  } catch (error) {
    res.status(400).json({
      data: null,
      error: { code: 'PAYMENT_SCHEDULE_ERROR', message: error.message }
    });
  }
});


app.post(
  '/payment_schedules/generate',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      const { customer_id, investment_amount, investment_date, plan_id } =
        req.body;
      const plan = await Plan.findById(plan_id);
      if (!plan) throw new Error('Plan not found');
      const schedules = await generatePaymentSchedule(
        customer_id,
        investment_amount,
        investment_date,
        plan
      );
      res.json({ data: schedules, error: null });
    } catch (error) {
      res
        .status(400)
        .json({ data: null, error: { code: 'GENERATION_ERROR', message: error.message } });
    }
  }
);

async function sendPaymentSuccessEmail(customer,plan, payment) {
  if (!customer?.email) return;

  await transporter.sendMail({
  from: `"Elite Wealth" <${GMAIL_EMAIL}>`,
  to: customer.email,
  subject: "Payment Successful - Elite Wealth",
  html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Successful</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#f4f7fb;
  font-family:Arial, sans-serif;
">

<table width="100%" cellpadding="0" cellspacing="0" align="center">
<tr>
<td align="center" style="padding:24px 12px;">

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

  <!-- LOGO -->
  <tr>
    <td align="center" style="padding-bottom:18px;">
      <img src="https://elitewealthfx.com/Logo_bg.png"
        alt="Elite Wealth"
        width="180" />
    </td>
  </tr>

  <!-- CARD -->
  <tr>
    <td style="
      background:#ffffff;
      padding:28px 24px;
      border-radius:16px;
      border:1px solid #e1e7f0;
    ">

      <!-- GREETING -->
      <p style="margin:0 0 18px; font-size:15px; color:#444;">
        Dear <strong>${customer.first_name || "Customer"}</strong>,
      </p>

      <p style="margin:0 0 26px; font-size:15px; color:#555; line-height:1.6;">
        payment has been successfully processed.
      </p>

      <!-- PLAN NAME CENTER -->
      <div style="text-align:center; margin-bottom:6px;">
        <div style="font-size:13px; color:#777; margin-bottom:4px;">
          Plan Name
        </div>
        <div style="
          font-size:18px;
          font-weight:bold;
          color:#1f4e79;
        ">
          ${plan?.name || "-"}
        </div>
      </div>

      <!-- PAYMENT TABLE -->
      <table width="100%" cellpadding="0" cellspacing="0"
        style="
          margin-top:26px;
          border-top:1px dashed #e0e7f1;
        ">

        <tr>
          <td style="padding-top:16px;">
            
            <!-- KEY VALUE COLUMN -->
           <table width="100%" cellpadding="0" cellspacing="0">

  <tr>
    <td style="padding:10px 0; font-size:14px;">
      <span style="color:#777;">Amount Paid</span>
      <span style="float:right; font-weight:bold; color:#000;">
        ₹${payment.amount}
      </span>
    </td>
  </tr>

  <tr>
    <td style="padding:10px 0; font-size:14px;">
      <span style="color:#777;">Payment Date</span>
      <span style="float:right; color:#000;">
        ${payment.payment_date}
      </span>
    </td>
  </tr>

  <tr>
    <td style="padding:10px 0; font-size:14px;">
      <span style="color:#777;">Payment Method</span>
      <span style="float:right; color:#000;">
        ${payment.payment_method}
      </span>
    </td>
  </tr>

</table>


          </td>
        </tr>
      </table>

      <!-- TRANSACTION ID CENTER -->
      ${payment.transaction_id ? `
      <div style="
        margin-top:26px;
        text-align:center;
      ">
        <div style="font-size:13px; color:#777; margin-bottom:6px;">
          Transaction ID
        </div>

        <div style="
          background:#f1f5f9;
          padding:14px;
          border-radius:10px;
          font-size:13px;
          color:#333;
          word-break:break-all;
          line-height:1.5;
        ">
          ${payment.transaction_id}
        </div>
      </div>
      ` : ``}

      <!-- FOOTER -->
      <p style="
        margin-top:30px;
        font-size:14px;
        color:#777;
        text-align:center;
      ">
        Thank you for investing <br> <strong>Elite Wealth</strong>
      </p>

    </td>
  </tr>

  <!-- COPYRIGHT -->
  <tr>
    <td align="center"
      style="padding-top:18px; font-size:12px; color:#999;">
      © ${new Date().getFullYear()} Elite Wealth. All rights reserved.
    </td>
  </tr>

</table>

</td>
</tr>
</table>

</body>
</html>
  `,
});




}


app.patch(
  '/payment_schedules/:id/mark_paid',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  upload.array('files'),
  async (req, res) => {
    try {
      const { transaction_id, payment_method } = req.body;
      const images = req.files ? await uploadImages(req.files) : [];
      const oldData = await PaymentSchedule.findById(req.params.id);
      if (!oldData) throw new Error('Not found');

      const updateData = {
        is_paid: true,
        paid_at: new Date(),
        transaction_id: transaction_id || oldData.transaction_id,
        payment_method: payment_method || oldData.payment_method,
        images: [...oldData.images, ...images],
      };

      const data = await PaymentSchedule.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );
      await auditLog(
        'payment_schedules',
        data._id,
        'PAYMENT_MARKED',
        oldData.toObject(),
        data.toObject(),
        req.user.user_id
      );

      const allPaid = (
        await PaymentSchedule.find({ customer_id: oldData.customer_id })
      ).every((s) => s.is_paid);
      if (allPaid) {
        await Customer.findByIdAndUpdate(
          oldData.customer_id,
          { approval_status: 'settled', updated_at: new Date() }
        );
        await auditLog(
          'customers',
          oldData.customer_id,
          'SETTLED',
          null,
          { approval_status: 'settled' },
          req.user.user_id
        );
      }

      const customer = await Customer.findById(oldData.customer_id);
      const plan = await Plan.findById(customer.plan_id);
      await sendPaymentSuccessEmail(customer, plan, data);
      res.json({ data: { success: true, updated: data }, error: null });
    } catch (error) {
      res
        .status(400)
        .json({ data: null, error: { code: 'PAYMENT_ERROR', message: error.message } });
    }
  }
);

// ------------------- AGENT PAYMENTS -------------------


app.get('/agent-payments', authMiddleware, async (req, res) => {
  try {
    const { agent_id } = req.query;

    const query = agent_id ? { agent_id } : {};
    const total = await AgentPayment.countDocuments(query);

    // Removed skip() and limit() → fetch ALL items
    const data = await AgentPayment.find(query)
      .sort({ payment_date: 1 });

    res.json({ data: { items: data, total }, error: null });
  } catch (error) {
    res.status(400).json({
      data: null,
      error: { code: 'AGENT_PAYMENT_ERROR', message: error.message }
    });
  }
});


app.post(
  '/agent-payments',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  upload.array('files'),
  async (req, res) => {
    try {
      const validated = AgentPaymentCreateSchema.parse(
        JSON.parse(req.body.data || '{}')
      );
      const images = req.files ? await uploadImages(req.files) : [];
      const data = await AgentPayment.create({
        ...validated,
        images,
        created_at: new Date(),
      });
      await auditLog(
        'agent_payments',
        data._id,
        'CREATE',
        null,
        data.toObject(),
        req.user.user_id
      );
      res.json({ data, error: null });
    } catch (error) {
      res
        .status(400)
        .json({ data: null, error: { code: 'VALIDATION_ERROR', message: error.message } });
    }
  }
);

app.patch(
  '/agent-payments/:id/mark_paid',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  upload.array('files'),
  async (req, res) => {
    try {
      const { transaction_id, method } = req.body;
      const images = req.files ? await uploadImages(req.files) : [];
      const oldData = await AgentPayment.findById(req.params.id);
      if (!oldData) throw new Error('Not found');

      const updateData = {
        is_paid: true,
        paid_at: new Date(),
        transaction_id: transaction_id || oldData.transaction_id,
        method: method || oldData.method,
        images: [...oldData.images, ...images],
      };

      const data = await AgentPayment.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );
      await auditLog(
        'agent_payments',
        data._id,
        'PAYMENT_MARKED',
        oldData.toObject(),
        data.toObject(),
        req.user.user_id
      );
      res.json({ data: { success: true, updated: data }, error: null });
    } catch (error) {
      res
        .status(400)
        .json({ data: null, error: { code: 'PAYMENT_ERROR', message: error.message } });
    }
  }
);

// ------------------- GIFT PLANS -------------------
app.get('/gift-plans', authMiddleware, async (req, res) => {
  try {
    const data = await GiftPlan.find().sort({ created_at: -1 });
    res.json({ data, error: null });
  } catch (error) {
    res
      .status(400)
      .json({ data: null, error: { code: 'GIFT_PLAN_ERROR', message: error.message } });
  }
});

app.post(
  '/gift-plans',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      const validated = GiftPlanCreateSchema.parse(req.body);
      const data = await GiftPlan.create({
        ...validated,
        created_at: new Date(),
        updated_at: new Date(),
      });
      await auditLog(
        'gift_plans',
        data._id,
        'CREATE',
        null,
        data.toObject(),
        req.user.user_id
      );
      res.json({ data, error: null });
    } catch (error) {
      res
        .status(400)
        .json({ data: null, error: { code: 'VALIDATION_ERROR', message: error.message } });
    }
  }
);


// ------------------- UPDATE GIFT PLAN (PARTIAL) -------------------
app.patch(
  '/gift-plans/:id',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Validate ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          data: null,
          error: { code: 'INVALID_ID', message: 'Invalid gift plan ID' },
        });
      }

     
      const UpdateSchema = GiftPlanCreateSchema.partial().extend({
        is_active: z.boolean().optional(),
      });

      const validated = UpdateSchema.parse(req.body);

  
      const oldData = await GiftPlan.findById(id);
      if (!oldData) {
        return res.status(404).json({
          data: null,
          error: { code: 'NOT_FOUND', message: 'Gift plan not found' },
        });
      }

    
      const updatedData = await GiftPlan.findByIdAndUpdate(
        id,
        { ...validated, updated_at: new Date() },
        { new: true }
      );

      // Audit log
      await auditLog(
        'gift_plans',
        updatedData._id,
        'UPDATE',
        oldData.toObject(),
        updatedData.toObject(),
        req.user.user_id
      );

      res.json({ data: updatedData, error: null });
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          data: null,
          error: { code: 'VALIDATION_ERROR', message: error.errors[0].message },
        });
      }
      console.error('Update gift plan error:', error);
      res.status(500).json({
        data: null,
        error: { code: 'UPDATE_ERROR', message: error.message },
      });
    }
  }
);

// ------------------- GET ACTIVE GIFT PLANS ONLY -------------------
app.get(
  '/gift-plans/active',
  authMiddleware,
  async (req, res) => {
    try {
      const { page = 1, page_size = 20 } = req.query;
      const skip = (page - 1) * page_size;
      const limit = Math.min(parseInt(page_size), 100);

      const query = { is_active: true };

      const total = await GiftPlan.countDocuments(query);
      const data = await GiftPlan.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      res.json({
        data: {
          items: data,
          total,
          page: parseInt(page),
          page_size: limit,
        },
        error: null,
      });
    } catch (error) {
      console.error('Get active gift plans error:', error);
      res.status(500).json({
        data: null,
        error: { code: 'FETCH_ERROR', message: error.message },
      });
    }
  }
);

// ------------------- AGENT REWARDS -------------------
app.get('/agent-rewards', authMiddleware, async (req, res) => {
  try {
    const { agent_id, performance_month } = req.query;
    const query = {};
    if (agent_id) query.agent_id = agent_id;
    if (performance_month) query.performance_month = performance_month;
    const data = await AgentReward.find(query).sort({ created_at: -1 });
    res.json({ data, error: null });
  } catch (error) {
    res
      .status(400)
      .json({ data: null, error: { code: 'AGENT_REWARD_ERROR', message: error.message } });
  }
});

app.patch(
  '/agent-rewards/:id/mark_rewarded',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  upload.array('files'),
  async (req, res) => {
    try {
      const { reward_method, transaction_id } = req.body;
      const images = req.files ? await uploadImages(req.files) : [];
      const oldData = await AgentReward.findById(req.params.id);
      if (!oldData) throw new Error('Not found');

      const updateData = {
        is_rewarded: true,
        rewarded_at: new Date(),
        reward_method: reward_method || oldData.reward_method,
        transaction_id: transaction_id || oldData.transaction_id,
        images: [...oldData.images, ...images],
      };

      const data = await AgentReward.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );
      await auditLog(
        'agent_rewards',
        data._id,
        'REWARD_MARKED',
        oldData.toObject(),
        data.toObject(),
        req.user.user_id
      );
      res.json({ data: { success: true, updated: data }, error: null });
    } catch (error) {
      res
        .status(400)
        .json({ data: null, error: { code: 'REWARD_ERROR', message: error.message } });
    }
  }
);




async function exportPaymentScheduleByMonthDay(day, res) {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    let targetDay = day === 15 ? 15 : Math.min(30, new Date(year, month + 1, 0).getDate());

    const targetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
      targetDay
    ).padStart(2, '0')}`;

    // Fetch schedules
    const schedules = await PaymentSchedule.find({
      payment_date: targetDateStr,
      is_paid: false,
    }).lean();

    if (!schedules.length) {
      return res.status(404).json({
        data: null,
        error: { code: "NO_DATA", message: `No pending payments due on ${targetDateStr}` },
      });
    }

    
    const customerIds = schedules.map(s => s.customer_id);
    const customers = await Customer.find({ _id: { $in: customerIds } })
      .select("first_name last_name email phone pan_number aadhar_number bank_name account_number ifsc_code branch return_method")
      .lean();

    const customerMap = {};
    customers.forEach(c => {
      customerMap[c._id.toString()] = c;
    });

    // SORT BY PAYMENT METHOD 
    const sortOrder = {
  Cash: 1,
  Online: 2,
  "Pre IPO": 3,
  "Pre-IPO": 3,
  Cheq: 4,
  Other: 5,
  Bank: 6,  
  None: 7,
  USDT:8,
  "PRE-IPO":3,
  
};

schedules.sort((a, b) => {
  const ac = customerMap[a.customer_id]?.return_method || "None";
  const bc = customerMap[b.customer_id]?.return_method || "None";
  return (sortOrder[ac] || 99) - (sortOrder[bc] || 99);
});


    
    const rows = schedules.map((s) => {
      const c = customerMap[s.customer_id] || {};

      return {
        "Customer Name": `${c.first_name || ''} ${c.last_name || ''}`.trim() || "N/A",
        "Email": c.email || "N/A",
        "Phone": c.phone || "N/A",
        "PAN": c.pan_number || "N/A",
        "Aadhaar": c.aadhar_number || "N/A",
        "Bank Name": c.bank_name || "N/A",
        "Account No": c.account_number || "N/A",
        "IFSC": c.ifsc_code || "N/A",
        "Branch": c.branch || "N/A",
        "Amount Due": s.amount,
        "Due Date": s.payment_date,
        "Type": s.is_principal ? "Principal + Interest" : "Interest Only",
        "Interest": s.interest_amount || 0,
        "Principal": s.principal_amount || 0,
        "Payout Month": s.payout_month,
        "Return Method": c.return_method || "None",
      };
    });

    // EXCEL COLUMNS & EXPORT 
    const columns = [
      { header: "Customer Name", key: "Customer Name", width: 22 },
      { header: "Email", key: "Email", width: 25 },
      { header: "Phone", key: "Phone", width: 14 },
      { header: "PAN", key: "PAN", width: 14 },
      { header: "Aadhaar", key: "Aadhaar", width: 16 },
      { header: "Bank Name", key: "Bank Name", width: 18 },
      { header: "Account No", key: "Account No", width: 16 },
      { header: "IFSC", key: "IFSC", width: 12 },
      { header: "Branch", key: "Branch", width: 16 },
      { header: "Amount Due", key: "Amount Due", width: 14 },
      { header: "Due Date", key: "Due Date", width: 14 },
      { header: "Type", key: "Type", width: 20 },
      { header: "Interest", key: "Interest", width: 12 },
      { header: "Principal", key: "Principal", width: 12 },
      { header: "Payout Month", key: "Payout Month", width: 12 },
      { header: "Return Method", key: "Return Method", width: 14 },
    ];

    const filename = `payments-due-${targetDateStr}.xlsx`;
    const { buffer } = await exportToExcel(rows, columns, filename);

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);

  } catch (error) {
    console.error("Export failed:", error);
    res.status(500).json({
      data: null,
      error: { code: "EXPORT_ERROR", message: error.message },
    });
  }
}



// ------------------- PAYMENT SCHEDULE EXPORT - 15th -------------------
app.get(
  '/payment-schedules/export/15th',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    await exportPaymentScheduleByMonthDay(15, res);
  }
);

// ------------------- PAYMENT SCHEDULE EXPORT - 30th (Smart: Last Day) -------------------
app.get(
  '/payment-schedules/export/30th',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    await exportPaymentScheduleByMonthDay(30, res);
  }
);


// GET SINGLE COMPANY INVESTMENT 
app.get(
  '/investments/:id',
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          data: null,
          error: { code: 'INVALID_ID', message: 'Invalid investment ID' },
        });
      }

     
      const investment = await CompanyInvestment.findById(id)
        .populate('submitted_by', 'first_name last_name email role')
        .populate('reviewed_by', 'first_name last_name email role')
        .lean();

      if (!investment) {
        return res.status(404).json({
          data: null,
          error: { code: 'NOT_FOUND', message: 'Investment not found' },
        });
      }

      
      const payment = await InvestmentPayment.findOne({ investment_id: id })
        .select('amount payment_date is_paid paid_at transaction_id payment_method images')
        .lean();

      // Fetch audit trail
      const audits = await AuditTrail.find({ table_name: 'company_investments', record_id: id })
        .populate('performed_by', 'first_name last_name email')
        .sort({ created_at: -1 })
        .limit(10)
        .lean();

      // Mask PII 
      const maskedInvestment = await maskPII(investment, req.user.role);

      // Format response
      const response = {
        investment: {
          id: maskedInvestment._id,
          name: maskedInvestment.investment_name,
          description: maskedInvestment.description || 'N/A',
          amount: maskedInvestment.investment_amount,
          expected_return: maskedInvestment.expected_return || null,
          return_percentage: maskedInvestment.return_percentage || null,
          investment_date: maskedInvestment.investment_date,
          duration_months: maskedInvestment.duration_months,
          approval_status: maskedInvestment.approval_status,
          review_comments: maskedInvestment.review_comments || null,
          images: maskedInvestment.images || [],
          submitted_by: maskedInvestment.submitted_by
            ? {
                id: maskedInvestment.submitted_by._id,
                name: `${maskedInvestment.submitted_by.first_name} ${maskedInvestment.submitted_by.last_name}`,
                email: maskedInvestment.submitted_by.email,
                role: maskedInvestment.submitted_by.role,
              }
            : null,
          reviewed_by: maskedInvestment.reviewed_by
            ? {
                id: maskedInvestment.reviewed_by._id,
                name: `${maskedInvestment.reviewed_by.first_name} ${maskedInvestment.reviewed_by.last_name}`,
                email: maskedInvestment.reviewed_by.email,
                role: maskedInvestment.reviewed_by.role,
              }
            : null,
          approved_at: maskedInvestment.approved_at || null,
          created_at: maskedInvestment.created_at,
          updated_at: maskedInvestment.updated_at,
        },
        payout: payment
          ? {
              amount: payment.amount,
              payment_date: payment.payment_date,
              is_paid: payment.is_paid,
              paid_at: payment.paid_at,
              transaction_id: payment.transaction_id || null,
              payment_method: payment.payment_method,
              images: payment.images || [],
            }
          : null,
        audit_trail: audits.map((a) => ({
          action: a.action,
          performed_by: a.performed_by
            ? `${a.performed_by.first_name} ${a.performed_by.last_name} (${a.performed_by.email})`
            : 'System',
          timestamp: a.created_at,
          changes: {
            old: a.old_values,
            new: a.new_values,
          },
        })),
      };

      res.json({ data: response, error: null });
    } catch (error) {
      console.error('Get investment detail error:', error);
      res.status(500).json({
        data: null,
        error: { code: 'INVESTMENT_DETAIL_ERROR', message: error.message },
      });
    }
  }
);



//CURRENT MONTH INVESTMENT PAYMENTS
app.get(
  '/investment-payments/current-month',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      const {
        page = 1,
        page_size = 50,
        is_paid, 
      } = req.query;

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      
      const query = {
        payment_date: { $gte: startDate, $lte: endDate },
      };

      if (is_paid !== undefined) {
        query.is_paid = is_paid === 'true';
      }

      const total = await InvestmentPayment.countDocuments(query);

      const payments = await InvestmentPayment.find(query)
        .select(
          'investment_id amount payment_date is_paid paid_at transaction_id payment_method images'
        )
        .sort({ payment_date: 1 })
        .skip((page - 1) * page_size)
        .limit(Math.min(page_size, 100))
        .lean();

      res.json({
        data: {
          items: payments.map(p => ({
            payment_id: p._id,
            investment_id: p.investment_id,
            amount: p.amount,
            payment_date: p.payment_date,
            is_paid: p.is_paid,
            paid_at: p.paid_at,
            transaction_id: p.transaction_id || null,
            payment_method: p.payment_method || 'None',
            images: p.images || [],
          })),
          total,
          page: parseInt(page),
          page_size: parseInt(page_size),
          current_month: `${year}-${String(month).padStart(2, '0')}`,
          date_range: { start: startDate, end: endDate },
        },
        error: null,
      });
    } catch (error) {
      console.error('Simple investment payments error:', error);
      res.status(500).json({
        data: null,
        error: { code: 'PAYMENTS_SIMPLE_ERROR', message: error.message },
      });
    }
  }
);


//  GET SINGLE AGENT DETAILS
app.get('/agents/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        data: null,
        error: { code: 'INVALID_ID', message: 'Invalid agent ID' },
      });
    }

    // Fetch agent
    const agent = await Agent.findById(id)
      .select(
        'first_name last_name agent_type phone email bank_name account_number ifsc_code pan_number aadhar_number address created_at updated_at'
      )
      .lean();

    if (!agent) {
      return res.status(404).json({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Agent not found' },
      });
    }

    res.json({ data: agent, error: null });
  } catch (error) {
    console.error('Get agent detail error:', error);
    res.status(500).json({
      data: null,
      error: { code: 'AGENT_DETAIL_ERROR', message: error.message },
    });
  }
});





app.get('/files/:filename', authMiddleware, (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }
    res.sendFile(filePath);
  });
});




// ------------------- FETCH DUE PAYMENTS BY DAY (15th or 30th) -------------------
async function getDuePaymentsByDay(day, res) {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0 = Jan

    let targetDay;
    if (day === 15) {
      targetDay = 15;
    } else {
     
      const lastDay = new Date(year, month + 1, 0).getDate();
      targetDay = Math.min(30, lastDay);
    }

    const targetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;

    
    const schedules = await PaymentSchedule.find({
      payment_date: targetDateStr,
      is_paid: false,
    })
      .populate({
        path: 'customer_id',
        select: 'first_name last_name email phone pan_number aadhar_number bank_name account_number ifsc_code branch',
        model: 'Customer', 
      })
      .lean();

    if (!schedules || schedules.length === 0) {
      return res.status(200).json({
        data: {
          items: [],
          total: 0,
          due_date: targetDateStr,
        },
        error: null,
      });
    }

    const formatted = schedules.map((s) => {
      const c = s.customer_id || {};
      return {
        _id: s._id,
        customer_name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown Customer',
        email: c.email || 'N/A',
        phone: c.phone || 'N/A',
        pan: c.pan_number || 'N/A',
        aadhaar: c.aadhar_number || 'N/A',
        bank_name: c.bank_name || 'N/A',
        account_number: c.account_number || 'N/A',
        ifsc_code: c.ifsc_code || 'N/A',
        branch: c.branch || 'N/A',
        amount_due: s.amount,
        due_date: s.payment_date,
        type: s.is_principal ? 'Principal + Interest' : 'Interest Only',
        interest: s.interest_amount || 0,
        principal: s.principal_amount || 0,
        payout_month: s.payout_month,
        payment_method: s.payment_method || 'None',
      };
    });

    res.status(200).json({
      data: {
        items: formatted,
        total: formatted.length,
        due_date: targetDateStr,
      },
      error: null,
    });
  } catch (error) {
      console.error(`Failed to fetch due payments for day ${day}:`, error);
      res.status(500).json({
        data: null,
        error: { code: 'FETCH_ERROR', message: error.message },
      });
  }
}

// ------------------- GET DUE PAYMENTS ON 15TH (JSON) -------------------
app.get(
  '/payment-schedules/due/15th',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    await getDuePaymentsByDay(15, res);
  }
);

// ------------------- GET DUE PAYMENTS ON 30TH (OR LAST DAY) (JSON) -------------------
app.get(
  '/payment-schedules/due/30th',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    await getDuePaymentsByDay(30, res);
  }
);




//------------------- get payment of ther specific investment-------------


app.get("/investments/:investmentId/payments", authMiddleware, async (req, res) => {
  try {
    const id = req.params.investmentId;

    const investment = await CompanyInvestment.findById(id).lean();
    if (!investment) {
      return res.status(404).json({
        data: null,
        error: { code: "INVESTMENT_NOT_FOUND", message: "Investment not found" }
      });
    }

    const invSchedules = await InvestmentPayment.find({ investment_id: id })
      .sort({ payment_date: 1 })
      .lean();

    const totalPaid = invSchedules.filter(s => s.is_paid)
      .reduce((sum, s) => sum + s.amount, 0);

    const totalPending = invSchedules.filter(s => !s.is_paid)
      .reduce((sum, s) => sum + s.amount, 0);

    return res.json({
      data: {
        investment,
        investment_payments: invSchedules,
        summary: {
          total_schedules: invSchedules.length,
          total_paid: totalPaid,
          total_pending: totalPending
        }
      },
      error: null
    });

  } catch (error) {
    res.status(500).json({
      data: null,
      error: { code: "SERVER_ERROR", message: error.message }
    });
  }
});


//-------------------get details of payment of specific customer-----------------
app.get("/customers/:customerId/payments", authMiddleware, async (req, res) => {
  try {
    const id = req.params.customerId;

    const customer = await Customer.findById(id).lean();
    if (!customer) {
      return res.status(404).json({
        data: null,
        error: { code: "CUSTOMER_NOT_FOUND", message: "Customer not found" }
      });
    }

    const schedules = await PaymentSchedule.find({ customer_id: id })
      .sort({ payment_date: 1 })
      .lean();

    const agentPayments = await AgentPayment.find({ customer_id: id })
      .sort({ payment_date: 1 })
      .lean();

    const totalPaid = schedules.filter(s => s.is_paid)
      .reduce((sum, s) => sum + s.amount, 0);

    const totalPending = schedules.filter(s => !s.is_paid)
      .reduce((sum, s) => sum + s.amount, 0);

    return res.json({
      data: {
        customer,
        payment_schedules: schedules,
        agent_payments: agentPayments,
        summary: {
          total_schedules: schedules.length,
          total_paid: totalPaid,
          total_pending: totalPending
        }
      },
      error: null
    });

  } catch (error) {
    res.status(500).json({
      data: null,
      error: { code: "SERVER_ERROR", message: error.message }
    });
  }
});


// ------------------- STATS -------------------
app.get('/stats/customers', authMiddleware, async (req, res) => {
  try {
    const total = await Customer.countDocuments();
    const pending = await Customer.countDocuments({ approval_status: 'pending' });
    const approved = await Customer.countDocuments({ approval_status: 'approved' });
    const rejected = await Customer.countDocuments({ approval_status: 'rejected' });
    const settled = await Customer.countDocuments({ approval_status: 'settled' });
    res.json({
      data: {
        total_customers: total,
        pending_approvals: pending,
        approved_customers: approved,
        rejected_customers: rejected,
        settled_customers: settled,
      },
      error: null,
    });
  } catch (error) {
    res
      .status(500)
      .json({ data: null, error: { code: 'STATS_ERROR', message: error.message } });
  }
});

app.get('/profiles/:userId', authMiddleware, async (req, res) => {
 try {
    const { userId } = req.params;

    // Validate UUID 
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({ error: { code: 'INVALID_UUID' } });
    }

    const profile = await Profile.findOne({ user_id: userId })
      .select('first_name last_name email role active')
      .lean();

    if (!profile) {
      return res.status(404).json({ error: { code: 'NOT_FOUND' } });
    }

    res.json({ data: profile, error: null });
  } catch (error) {
    console.error('Profile fetch by user_id error:', error);
    res.status(500).json({
      error: { code: 'PROFILE_FETCH_ERROR', message: error.message },
    });
  }
});
// ------------------- DASHBOARD STATS – COUNT OF INVESTMENTS -------------------
app.get(
  '/dashboard/stats',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      // Total Customers
      const totalCustomers = await Customer.countDocuments({});

      // Active Agents 
      const activeAgents = await Agent.countDocuments({ approval_status: 'approved' });

      // Pending Customer Approvals
      const pendingCustomers = await Customer.countDocuments({ approval_status: 'pending' });

      //  Total Number of Investments 
      const totalInvestmentsCount = await CompanyInvestment.countDocuments({});

      res.json({
        data: {
          total_customers: totalCustomers,
          active_agents: activeAgents,
          pending_customer_approvals: pendingCustomers,
          total_investments_count: totalInvestmentsCount, 
          last_updated: new Date().toISOString(),
        },
        error: null,
      });
    } catch (error) {
      console.error('Dashboard Stats Error:', error);
      res.status(500).json({
        data: null,
        error: { code: 'STATS_ERROR', message: error.message },
      });
    }
  }
);



// ------------------- CURRENT MONTH PAYMENT SCHEDULES  -------------------
app.get(
  '/payment-schedules/current-month',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin', 'office_staff']),
  async (req, res) => {
    try {
      // Current Month Range 
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); 

      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      //  Find All Payment Schedules in Current Month 
      const schedules = await PaymentSchedule.find({
        payment_date: { $gte: startStr, $lte: endStr }
      }).lean(); // .lean() for faster response

       
      const formatted = schedules.map(s => ({
        _id: s._id,
        customer_id: s.customer_id,
        amount: s.amount || 0,
        payment_date: s.payment_date,
        is_paid: s.is_paid || false,
        paid_at: s.paid_at || null,
        is_principal: s.is_principal || false,
        interest_amount: s.interest_amount || 0,
        principal_amount: s.principal_amount || 0,
        payout_month: s.payout_month || 0,
        payment_method: s.payment_method || 'None',
        transaction_id: s.transaction_id || null,
        images: s.images || [],
        start_date: s.start_date || null
      }));

      // Summary
      const totalDue = formatted.reduce((sum, s) => sum + s.amount, 0);
      const paidCount = formatted.filter(s => s.is_paid).length;
      const unpaidCount = formatted.filter(s => !s.is_paid).length;

      res.json({
        data: {
          items: formatted,
          total: formatted.length,
          current_month: `${year}-${String(month + 1).padStart(2, '0')}`,
          date_range: { start: startStr, end: endStr },
          summary: {
            total_due: totalDue,
            paid_count: paidCount,
            unpaid_count: unpaidCount,
            total_payments: formatted.length
          }
        },
        error: null
      });

    } catch (error) {
      console.error('Current Month Payment Schedules Error:', error);
      res.status(500).json({
        data: null,
        error: { code: 'CURRENT_MONTH_SCHEDULES_ERROR', message: error.message }
      });
    }
  }
);



// ------------------- GET ALL AUDIT TRAILS (RAW) -------------------
app.get(
  '/audit-trails',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      const {
        page = 1,
        page_size = 50,
        action,
        table_name,
        performed_by,
        record_id,
        start_date,
        end_date,
      } = req.query;

      const pageNum = parseInt(page, 10) || 1;
      const pageSize = parseInt(page_size, 10) || 50;
      const skip = (pageNum - 1) * pageSize;

      // Base query
      const query = {};

      // Filters
      if (action) query.action = action;
      if (table_name) query.table_name = table_name;
      if (performed_by) query.performed_by = performed_by;
      if (record_id) query.record_id = record_id;
      if (start_date || end_date) {
        query.created_at = {};
        if (start_date) query.created_at.$gte = new Date(start_date);
        if (end_date) {
          const end = new Date(end_date);
          end.setHours(23, 59, 59, 999);
          query.created_at.$lte = end;
        }
      }

      // Count total
      const total = await AuditTrail.countDocuments(query);

      // Fetch raw audit logs
      const logs = await AuditTrail.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(); 

      // Format timestamp
      const formatted = logs.map(log => ({
        _id: log._id,
        table_name: log.table_name || 'N/A',
        record_id: log.record_id ? log.record_id.toString() : 'N/A',
        action: log.action || 'N/A',
        old_values: log.old_values || null,
        new_values: log.new_values || null,
        performed_by: log.performed_by ? log.performed_by.toString() : 'System',
        created_at: format(log.created_at, 'yyyy-MM-dd HH:mm:ss'),
      }));

      res.json({
        data: {
          items: formatted,
          total,
          page: pageNum,
          page_size: pageSize,
          filters: { action, table_name, performed_by, record_id, start_date, end_date },
        },
        error: null,
      });
    } catch (error) {
      console.error('AuditTrail API Error:', error);
      res.status(500).json({
        data: null,
        error: { code: 'AUDIT_TRAIL_ERROR', message: error.message },
      });
    }
  }
);



// GET SETTLEMENT DETAILS 
app.get('/customers/:id/settlement-details', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        data: null,
        error: { code: 'INVALID_ID', message: 'Invalid customer ID' },
      });
    }

 
    const customer = await Customer.findById(id).lean();

    if (!customer) {
      return res.status(404).json({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Customer not found' },
      });
    }

    
    const planId = customer.plan_id;

    if (!planId) {
      return res.status(400).json({
        data: null,
        error: { code: 'NO_PLAN', message: 'Customer has no associated plan' },
      });
    }

    const plan = await Plan.findById(planId).lean();

    if (!plan) {
      return res.status(404).json({
        data: null,
        error: { code: 'PLAN_NOT_FOUND', message: 'Plan not found for this customer' },
      });
    }

    
    const invested_amount = customer.investment_amount || 0; 
    const discount_percentage = plan.discount_percentage || 0;
    const duration_months = plan.duration_months || 0;

    
    let principal_amount = invested_amount;

    
    if (plan.segment === 'INFRASTRUCTURE') {
      principal_amount = invested_amount * (1 - discount_percentage / 100);
    }

    
    const paidSchedules = await PaymentSchedule.find({
      customer_id: id,
      is_paid: true,
    }).select('amount');

    const total_paid = paidSchedules.reduce((sum, s) => sum + (s.amount || 0), 0);

    
    const settlement_amount = principal_amount - total_paid;

    res.json({
      data: {
        customer_id: id,
        customer_name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),

        
        segment: plan.segment,
        duration_months,

       
        invested_amount: parseFloat(invested_amount.toFixed(2)),       
        discount_applied: plan.segment === 'INFRASTRUCTURE' ? discount_percentage : 0,
        principal_amount: parseFloat(principal_amount.toFixed(2)),      
        total_paid: parseFloat(total_paid.toFixed(2)),
        settlement_amount: parseFloat(settlement_amount.toFixed(2)),

        settlement_type:
          settlement_amount > 0
            ? 'PAYABLE_TO_CUSTOMER'
            : settlement_amount < 0
            ? 'OVERPAID'
            : 'SETTLED',
      },
      error: null,
    });
  } catch (error) {
    console.error('Settlement API Error:', error);
    res.status(500).json({
      data: null,
      error: { code: 'SETTLEMENT_ERROR', message: error.message },
    });
  }
});




// GET PLAN BY ID
app.get('/plans/:id', authMiddleware, async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id).lean();
    if (!plan) return res.status(404).json({ data: null, error: { code: 'NOT_FOUND' } });
    res.json({ data: plan, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: { code: 'ERROR', message: error.message } });
  }
});

// GET TOTAL PAID
app.get('/customers/:id/total-paid', authMiddleware, async (req, res) => {
  try {
    const paid = await PaymentSchedule.find({ customer_id: req.params.id, is_paid: true });
    const total = paid.reduce((sum, p) => sum + p.amount, 0);
    res.json({ data: { total_paid: parseFloat(total.toFixed(2)) }, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: { code: 'ERROR', message: error.message } });
  }
});



// ------------------- CUSTOMER FULL EXCEL REPORT  -------------------


app.get(
  '/customers/:id/full-excel',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Fetch Customer 
      const customer = await Customer.findById(id)
        .populate({
          path: 'plan_id',
          select: 'name segment investment_amount return_percentage duration_months payment_type discount_percentage maturity_amount'
        })
        .populate({
          path: 'agent_id',
          select: 'first_name last_name email phone agent_type commission_percentage bank_name account_number ifsc_code branch'
        })
        .lean();

      if (!customer) {
        return res.status(404).json({ 
          data: null, 
          error: { code: 'NOT_FOUND', message: 'Customer not found' } 
        });
      }

      // Fetch payments
      const payments = await PaymentSchedule.find({ customer_id: id }).lean();

      // Calculate totals
      const totalPaid = payments
        .filter(p => p.is_paid)
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const totalExpected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const pending = totalExpected - totalPaid;

      // Excel Workbook
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Customer Full Report');

      // Title
      sheet.mergeCells('A1:O1');
      sheet.getCell('A1').value = 'ELITE WEALTH - COMPLETE CUSTOMER REPORT';
      sheet.getCell('A1').font = { size: 18, bold: true };
      sheet.getCell('A1').alignment = { horizontal: 'center' };

      sheet.mergeCells('A2:O2');
      sheet.getCell('A2').value = `${customer.first_name} ${customer.last_name} | ID: ${id} | ${new Date().toLocaleDateString('en-IN')}`;
      sheet.getCell('A2').font = { size: 14, bold: true };

      let row = 4;

      // Customer Details
      sheet.getCell(`A${row}`).value = 'CUSTOMER DETAILS';
      sheet.getCell(`A${row++}`).font = { bold: true, size: 13 };
      sheet.addRow(['Name', `${customer.first_name || ''} ${customer.last_name || ''}`.trim()]);
      sheet.addRow(['Email', customer.email || 'N/A']);
      sheet.addRow(['Phone', customer.phone || 'N/A']);
      sheet.addRow(['PAN', customer.pan_number || 'N/A']);
      sheet.addRow(['Aadhar', customer.aadhar_number || 'N/A']);
      sheet.addRow(['Address', customer.address || 'N/A']);
      sheet.addRow(['Nominee', customer.nominee || 'N/A']);
      sheet.addRow(['Bank', customer.bank_name || 'N/A']);
      sheet.addRow(['A/c No', customer.account_number || 'N/A']);
      sheet.addRow(['IFSC', customer.ifsc_code || 'N/A']);
      sheet.addRow(['Investment Date', customer.investment_date ? format(new Date(customer.investment_date), 'dd-MM-yyyy') : 'N/A']);
      sheet.addRow(['Status', customer.approval_status?.toUpperCase() || 'N/A']);
      row += 13;

      // PLAN DETAILS 
      const plan = customer.plan_id || {};
      sheet.getCell(`A${row}`).value = 'PLAN DETAILS';
      sheet.getCell(`A${row++}`).font = { bold: true, size: 13 };
      sheet.addRow(['Plan Name', plan.name || 'N/A']);
      sheet.addRow(['Segment', plan.segment || 'N/A']);
      sheet.addRow(['Investment Amount', `₹${(plan.investment_amount || customer.investment_amount || 0).toLocaleString('en-IN')}`]);
      sheet.addRow(['Return %', `${plan.return_percentage || 0}%`]);
      sheet.addRow(['Duration', `${plan.duration_months || 0} months`]);
      sheet.addRow(['Payment Type', plan.payment_type || 'N/A']);
      sheet.addRow(['Discount %', `${plan.discount_percentage || 0}%`]);
      sheet.addRow(['Maturity Amount', plan.maturity_amount ? `₹${plan.maturity_amount.toLocaleString('en-IN')}` : 'N/A']);
      row += 10;

      // AGENT DETAILS 
      const agent = customer.agent_id || {};
      sheet.getCell(`A${row}`).value = 'AGENT DETAILS';
      sheet.getCell(`A${row++}`).font = { bold: true, size: 13 };
      if (agent && agent._id) {
        sheet.addRow(['Agent Name', `${agent.first_name || ''} ${agent.last_name || ''}`.trim()]);
        sheet.addRow(['Email', agent.email || 'N/A']);
        sheet.addRow(['Phone', agent.phone || 'N/A']);
        sheet.addRow(['Agent Type', agent.agent_type || 'N/A']);
        sheet.addRow(['Commission %', `${agent.commission_percentage || 0}%`]);
        sheet.addRow(['Bank', agent.bank_name || 'N/A']);
        sheet.addRow(['A/c No', agent.account_number || 'N/A']);
        sheet.addRow(['IFSC', agent.ifsc_code || 'N/A']);
        sheet.addRow(['Branch', agent.branch || 'N/A']);
      } else {
        sheet.addRow(['Agent', 'DIRECT CUSTOMER (No Agent Assigned)']);
      }
      row += 11;

      // Payment Summary
      sheet.getCell(`A${row}`).value = 'PAYMENT SUMMARY';
      sheet.getCell(`A${row++}`).font = { bold: true, size: 13 };
      sheet.addRow(['Total Expected', `₹${totalExpected.toLocaleString('en-IN')}`]);
      sheet.addRow(['Total Paid', `₹${totalPaid.toLocaleString('en-IN')}`]);
      sheet.addRow(['Pending Amount', `₹${pending.toLocaleString('en-IN')}`]);
      sheet.addRow(['Progress', `${totalExpected > 0 ? ((totalPaid / totalExpected) * 100).toFixed(2) : 0}%`]);
      row += 6;

      // Payment Schedule
      sheet.addRow(['FULL PAYMENT SCHEDULE']).font = { bold: true, size: 14 };
      sheet.addRow([
        'Sr.', 'Due Date', 'Amount', 'Paid Date', 'Status',
        'Principal', 'Interest', 'Type', 'Payout Month', 'Method', 'Txn ID'
      ]).font = { bold: true };

      payments.forEach((p, i) => {
        const r = sheet.addRow([
          i + 1,
          format(new Date(p.payment_date), 'dd-MM-yyyy'),
          p.amount || 0,
          p.paid_at ? format(new Date(p.paid_at), 'dd-MM-yyyy') : '-',
          p.is_paid ? 'PAID' : 'PENDING',
          p.principal_amount || 0,
          p.interest_amount || 0,
          p.payment_type || 'N/A',
          p.payout_month || '-',
          p.payment_method || 'None',
          p.transaction_id || '-'
        ]);
        if (p.is_paid) r.getCell(5).font = { color: { argb: 'FF006400' }, bold: true };
        if (p.is_principal) r.eachCell(c => c.font = { bold: true });
      });

      // Column widths
      sheet.columns = [
        { width: 6 }, { width: 14 }, { width: 16 }, { width: 14 }, { width: 12 },
        { width: 14 }, { width: 14 }, { width: 12 }, { width: 14 }, { width: 12 }, { width: 20 }
      ];

      // Send file
      const filename = `EliteWealth_Customer_${id}_${customer.first_name || 'User'}_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      await workbook.xlsx.write(res);
      res.end();

    } catch (err) {
      console.error('Excel Report Error:', err);
      res.status(500).json({
        data: null,
        error: { code: 'EXCEL_ERROR', message: 'Failed to generate report', details: err.message }
      });
    }
  }
);





app.get(
  '/investments/:id/export-excel',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      const investment_id = req.params.id;

      // Fetch investment
      const investment = await CompanyInvestment.findById(investment_id).lean();
      if (!investment) throw new Error("Investment not found");

      // Fetch monthly payments
      const payments = await InvestmentPayment.find({ investment_id })
        .sort({ payout_cycle: 1 })
        .lean();

      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Investment Report");

     
      ws.addRow(["INVESTMENT DETAILS"]);
      ws.getRow(1).font = { bold: true, size: 14 };

      ws.addRow(["Investment ID", investment._id]);
      ws.addRow(["Investment Name", investment.investment_name || "-"]);
      ws.addRow(["Investment Amount", investment.investment_amount]);
      ws.addRow(["Monthly Return %", investment.return_percentage]);
      ws.addRow(["Duration (Months)", investment.duration_months]);
      ws.addRow(["Investment Date", investment.investment_date]);

      ws.addRow([]); 

      ws.addRow(["MONTHLY PAYMENT SCHEDULE"]);
      const headerRow = ws.addRow([
        "Month No.",
        "Payment Date",
        "Interest Amount",
        "Paid?",
        "Payment Method",
        "Transaction ID"
      ]);

      
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFCCCCCC" },
        };
      });

      
      payments.forEach((p) => {
        ws.addRow([
          p.payout_cycle,
          p.payment_date,
          p.amount,
          p.is_paid ? "Yes" : "No",
          p.payment_method || "None",
          p.transaction_id || "-"
        ]);
      });

      
      ws.columns.forEach((column) => {
        let maxLength = 10;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const len = cell.value ? cell.value.toString().length : 10;
          if (len > maxLength) maxLength = len;
        });
        column.width = maxLength + 5;
      });

      
      const fileBuffer = await workbook.xlsx.writeBuffer();

      
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=investment_${investment_id}.xlsx`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(fileBuffer);

    } catch (err) {
      console.error("Excel Export Error:", err);
      res.status(400).json({
        data: null,
        error: { code: "EXPORT_ERROR", message: err.message },
      });
    }
  }
);


// Get Payment Details of a Particular Agent 
app.get('/agent-payments/details/:agent_id', authMiddleware, rbacMiddleware(['manager', 'super_admin']), async (req, res) => {
  try {
    const { agent_id } = req.params;
    const { page = 1, page_size = 20 } = req.query;

    const query = { agent_id };

    const total = await AgentPayment.countDocuments(query);

    const payments = await AgentPayment.find(query)
      .skip((page - 1) * page_size)
      .limit(Math.min(page_size, 100))
      .sort({ payment_date: 1 })
      .lean();

    const detailedPayments = await Promise.all(
      payments.map(async (payment) => {
        const customer = await Customer.findById(payment.customer_id).lean();

        return {
          ...payment,
          customer: customer
            ? {
                full_name: `${customer.first_name} ${customer.last_name}`,
                email: customer.email,
                phone: customer.phone,
                investment_amount: customer.investment_amount,
                approved_at: customer.approved_at
              }
            : null
        };
      })
    );

    res.json({
      data: {
        items: detailedPayments,
        total
      },
      error: null
    });
  } catch (error) {
    res.status(400).json({
      data: null,
      error: { code: 'AGENT_PAYMENT_DETAILS_ERROR', message: error.message }
    });
  }
});



// Serve image by filename 
app.get('/images/:filename', authMiddleware, (req, res) => {
  try {
    const { filename } = req.params;
    
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid filename' } });
    }

    const filePath = path.join(uploadDir, filename); 
    fs.access(filePath, fs.constants.R_OK, (err) => {
      if (err) return res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'File not found' } });
      res.sendFile(filePath);
    });
  } catch (err) {
    console.error('GET /images/:filename error', err);
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});





// ---------- CREATE BONUS PLAN ----------
app.post('/bonus-plans', authMiddleware, rbacMiddleware(['super_admin']), async (req, res) => {
  try {
    const body = BonusPlanCreateSchema.parse(req.body);

    const start_date = new Date(); 
    const end_date = new Date(body.end_date);
    if (isNaN(end_date.getTime())) throw new Error('Invalid end_date');

    const duration_months = Math.max(0, monthsDiff(start_date, end_date));

    const doc = await BonusPlan.create({
      name: body.name,
      description: body.description || '',
      target_investors: body.target_investors || 0,
      target_amount: body.target_amount || 0,
      reward_type: body.reward_type,
      reward_value: body.reward_value,
      start_date,
      end_date,
      duration_months,
      is_active: start_date <= end_date,
      created_at: new Date(),
      updated_at: new Date()
    });

    await auditLog('bonus_plans', doc._id, 'CREATE', null, doc.toObject(), req.user.user_id);
    res.json({ data: doc, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { code: 'BONUS_PLAN_CREATE_ERROR', message: err.message } });
  }
});


// ---------- GET BONUS PLANS ----------
app.get('/bonus-plans', authMiddleware, rbacMiddleware(['super_admin']), async (req, res) => {
  try {
    const { page = 1, page_size = 50 } = req.query;
    const skip = (Math.max(1, page) - 1) * Math.max(1, page_size);
    const total = await BonusPlan.countDocuments();
    const items = await BonusPlan.find().sort({ created_at: -1 }).skip(skip).limit(Math.min(100, page_size));
    res.json({ data: { items, total }, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { code: 'BONUS_PLAN_LIST_ERROR', message: err.message } });
  }
});


// ---------- PATCH BONUS PLAN  ----------
app.patch('/bonus-plans/:id', authMiddleware, rbacMiddleware(['super_admin']), async (req, res) => {
  try {
    const plan = await BonusPlan.findById(req.params.id);
    if (!plan) throw new Error('Bonus plan not found');

    const update = { updated_at: new Date() };

    // Activate
    if (req.body.is_active === true) {
      const newStart = new Date();
      const newEnd = new Date(newStart);
      const months = plan.duration_months || (req.body.duration_months || 0);
      newEnd.setMonth(newEnd.getMonth() + months);
      update.start_date = newStart;
      update.end_date = newEnd;
      update.is_active = true;
    }

    // Deactivate
    if (req.body.is_active === false) {
      update.end_date = new Date();
      update.is_active = false;
    }

    
    const allowed = ['name','description','target_investors','target_amount','reward_type','reward_value'];
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

   
    if (req.body.end_date) {
      const e = new Date(req.body.end_date);
      if (isNaN(e.getTime())) throw new Error('Invalid end_date');
      update.end_date = e;
      const s = update.start_date || plan.start_date || new Date();
      update.duration_months = monthsDiff(new Date(s), e);
    }

    const updated = await BonusPlan.findByIdAndUpdate(req.params.id, update, { new: true });
    await auditLog('bonus_plans', updated._id, 'UPDATE', plan.toObject(), updated.toObject(), req.user.user_id);
    res.json({ data: updated, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { code: 'BONUS_PLAN_PATCH_ERROR', message: err.message } });
  }
});


// ---------- EXPORT BONUS PLANS  ----------
app.get('/bonus-plans/export', authMiddleware, rbacMiddleware(['super_admin']), async (req, res) => {
  try {
    const plans = await BonusPlan.find().lean();
    const rows = plans.map(p => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      reward_type: p.reward_type,
      reward_value: p.reward_value,
      target_investors: p.target_investors,
      target_amount: p.target_amount,
      start_date: p.start_date,
      end_date: p.end_date,
      duration_months: p.duration_months,
      is_active: p.is_active,
      created_at: p.created_at
    }));

    const columns = [
      { header: 'ID', key: '_id' },
      { header: 'Name', key: 'name' },
      { header: 'Description', key: 'description' },
      { header: 'Reward Type', key: 'reward_type' },
      { header: 'Reward Value', key: 'reward_value' },
      { header: 'Target Investors', key: 'target_investors' },
      { header: 'Target Amount', key: 'target_amount' },
      { header: 'Start Date', key: 'start_date' },
      { header: 'End Date', key: 'end_date' },
      { header: 'Duration (months)', key: 'duration_months' },
      { header: 'Active', key: 'is_active' },
      { header: 'Created At', key: 'created_at' }
    ];

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `bonus_plans_${timestamp}.xlsx`;
    const { buffer } = await exportToExcel(rows, columns, filename);

    await auditLog('bonus_plans', null, 'EXPORT', null, { count: plans.length, filename }, req.user.user_id);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'BONUS_PLAN_EXPORT_ERROR', message: err.message } });
  }
});


// ---------- auto-deactivate plans after end_date ----------
cron.schedule('30 0 * * *', async () => {
  try {
    const now = new Date();
    await BonusPlan.updateMany({ is_active: true, end_date: { $lte: now } }, { is_active: false, updated_at: now });
  } catch (err) {
    console.error('BonusPlan cron error:', err);
  }
});





async function generateAgentBonus(customer_id, agent_id) {
  try {
    const agent = await Agent.findById(agent_id);
    if (!agent) return [];

    const customer = await Customer.findById(customer_id);
    if (!customer) return [];

    const today = new Date();

    const activePlans = await BonusPlan.find({
      is_active: true,
      start_date: { $lte: today },
      end_date: { $gte: today }
    });

    const newBonuses = [];

    for (const plan of activePlans) {
      const plan_start = new Date(plan.start_date);
      const plan_end = new Date(plan.end_date);
      const performanceMonth = plan_start.toISOString().slice(0, 7);

      const existing = await AgentBonus.findOne({
        agent_id,
        reward_plan_id: plan._id,
        performance_month: performanceMonth
      });

      if (existing) continue;

      const customers = await Customer.find({
        agent_id,
        approval_status: "approved",
        investment_date: {
          $gte: plan_start.toISOString().split("T")[0],
          $lte: plan_end.toISOString().split("T")[0]
        }
      });

      
      const achieved_investors = customers.length;
      const achieved_amount = customers.reduce(
        (sum, c) => sum + (c.investment_amount || 0), 0
      );

      
      if (achieved_investors === 0 && achieved_amount === 0) continue;

      // Eligibility
      const eligible =
        achieved_investors >= (plan.target_investors || 0) ||
        achieved_amount >= (plan.target_amount || 0);

      if (!eligible) continue;

      // Create Bonus
      const bonus = {
        agent_id,
        reward_plan_id: plan._id,
        performance_month: performanceMonth,
        achieved_investors,
        achieved_amount,
        reward_type: plan.reward_type,
        reward_value: plan.reward_value,
        reward_method: "None",
        is_rewarded: false,
        amount: plan.reward_type === "BONUS" ? plan.reward_value : null,
        physical_description: plan.reward_type === "PHYSICAL" ? plan.reward_value : null,
        images: [],
        created_at: new Date()
      };

      newBonuses.push(bonus);
    }

    if (newBonuses.length > 0) {
      const data = await AgentBonus.insertMany(newBonuses);

      await auditLog("agent_bonus", customer_id, "GENERATE_AGENT_BONUS",
        null, { count: data.length }, agent_id);

      return data;
    }

    return [];

  } catch (err) {
    console.error("generateAgentBonus ERROR:", err);
    return [];
  }
}



// ---------- BONUS PAYMENT ----------
app.post('/bonus-payments', authMiddleware, rbacMiddleware(['manager','super_admin']), upload.array('files'), async (req, res) => {
  try {
    const body = AgentBonusPaymentSchema.parse(JSON.parse(req.body.data || '{}'));
    const bonus = await AgentBonus.findById(body.bonus_id);
    if (!bonus) throw new Error('Agent bonus not found');

    const plan = await BonusPlan.findById(bonus.reward_plan_id);
    if (!plan) throw new Error('Bonus plan not found');

    
    const images = req.files ? await uploadImages(req.files) : [];

    const update = {
      reward_method: body.reward_method,
      images,
      is_rewarded: true,
      rewarded_at: new Date()
    };

    if (plan.reward_type === 'BONUS') {
      update.amount = body.amount || 0;
      update.transaction_id = body.transaction_id || null;
      update.physical_description = null;
    } else { 
      update.physical_description = body.physical_description || null;
      update.amount = null;
      update.transaction_id = null;
    }

    const updated = await AgentBonus.findByIdAndUpdate(body.bonus_id, update, { new: true });
    await auditLog('agent_bonuses', updated._id, 'PAY', null, updated.toObject(), req.user.user_id);

    res.json({ data: updated, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { code: 'BONUS_PAYMENT_CREATE_ERROR', message: err.message } });
  }
});


// ----------  GET AGENT BONUSES  ----------
app.get('/bonus-payments', authMiddleware, rbacMiddleware(['manager','super_admin']), async (req, res) => {
  try {
    const { page = 1, page_size = 50, agent_id } = req.query;
    const skip = (Math.max(1, page) - 1) * Math.max(1, page_size);
    const q = agent_id ? { agent_id } : {};
    const total = await AgentBonus.countDocuments(q);
    const items = await AgentBonus.find(q).sort({ created_at: -1 }).skip(skip).limit(Math.min(200, page_size));
    res.json({ data: { items, total }, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { code: 'AGENT_BONUS_LIST_ERROR', message: err.message } });
  }
});


// ---------- GET AGENT BONUS BY ID ----------
app.get('/bonus-payments/:id', authMiddleware, rbacMiddleware(['manager','super_admin']), async (req, res) => {
  try {
    const data = await AgentBonus.findById(req.params.id);
    if (!data) return res.status(404).json({ data: null, error: { code: 'NOT_FOUND' } });
    res.json({ data, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { code: 'AGENT_BONUS_GET_ERROR', message: err.message } });
  }
});


// ---------- MARK AGENT BONUS AS PAID ----------
app.patch('/bonus-payments/:id/pay', authMiddleware, rbacMiddleware(['manager','super_admin']), async (req, res) => {
  try {
    const updated = await AgentBonus.findByIdAndUpdate(req.params.id, { is_rewarded: true, rewarded_at: new Date() }, { new: true });
    await auditLog('agent_bonuses', updated._id, 'MARK_PAID', null, updated.toObject(), req.user.user_id);
    res.json({ data: updated, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { code: 'AGENT_BONUS_MARK_PAID_ERROR', message: err.message } });
  }
});


// ---------- EXPORT AGENT BONUSES WITH AGENT DETAILS ----------
app.get('/bonus-payments/export', authMiddleware, rbacMiddleware(['manager','super_admin']), async (req, res) => {
  try {
    const { is_rewarded, agent_id } = req.query;
    const q = {};
    if (is_rewarded !== undefined) q.is_rewarded = is_rewarded === 'true';
    if (agent_id) q.agent_id = agent_id;

    const bonuses = await AgentBonus.find(q).lean();

    const rows = await Promise.all(bonuses.map(async b => {
      let agent = null;
      try { agent = await Agent.findById(b.agent_id).lean(); } catch(e) { agent = null; }
      return {
        _id: b._id,
        agent_id: b.agent_id,
        agent_name: agent ? `${agent.first_name || ''} ${agent.last_name || ''}`.trim() : null,
        agent_email: agent ? agent.email : null,
        agent_phone: agent ? agent.phone : null,
        reward_plan_id: b.reward_plan_id,
        reward_type: b.reward_type,
        reward_value: b.reward_value,
        performance_month: b.performance_month,
        achieved_investors: b.achieved_investors,
        achieved_amount: b.achieved_amount,
        is_rewarded: b.is_rewarded,
        rewarded_at: b.rewarded_at,
        reward_method: b.reward_method,
        amount: b.amount,
        transaction_id: b.transaction_id,
        physical_description: b.physical_description,
        created_at: b.created_at
      };
    }));

    const columns = [
      { header: 'ID', key: '_id' },
      { header: 'Agent ID', key: 'agent_id' },
      { header: 'Agent Name', key: 'agent_name' },
      { header: 'Agent Email', key: 'agent_email' },
      { header: 'Agent Phone', key: 'agent_phone' },
      { header: 'Plan ID', key: 'reward_plan_id' },
      { header: 'Reward Type', key: 'reward_type' },
      { header: 'Reward Value', key: 'reward_value' },
      { header: 'Performance Month', key: 'performance_month' },
      { header: 'Achieved Investors', key: 'achieved_investors' },
      { header: 'Achieved Amount', key: 'achieved_amount' },
      { header: 'Paid', key: 'is_rewarded' },
      { header: 'Paid At', key: 'rewarded_at' },
      { header: 'Payment Method', key: 'reward_method' },
      { header: 'Amount', key: 'amount' },
      { header: 'Transaction ID', key: 'transaction_id' },
      { header: 'Physical Description', key: 'physical_description' },
      { header: 'Created At', key: 'created_at' }
    ];

    const timestamp = new Date().toISOString().replace(/[:.]/g,'-');
    const filename = `agent_bonuses_${timestamp}.xlsx`;
    const { buffer } = await exportToExcel(rows, columns, filename);

    await auditLog('agent_bonuses', null, 'EXPORT', null, { count: rows.length, filename }, req.user.user_id);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'AGENT_BONUS_EXPORT_ERROR', message: err.message } });
  }
});




const _iso = (d) => new Date(d).toISOString().split('T')[0];

// Compute first payment date from investment_date
function computeFirstPaymentDateFromInvestment(investmentDateStr) {
  const base = investmentDateStr ? new Date(investmentDateStr) : new Date();
  const day = base.getDate();
  let payDay;
  if (day <= 15) {
    payDay = 15;
  } else {
    const nextMonth = base.getMonth() + 1;
    const isFebruary = nextMonth === 1;
    payDay = isFebruary ? new Date(base.getFullYear(), nextMonth + 1, 0).getDate() : 30;
  }
  const first = new Date(Date.UTC(base.getFullYear(), base.getMonth() + 1, payDay));
  return first;
}


// async function generateRdInstallments(rdCustomer) {
//   const plan = await RdPlan.findById(rdCustomer.plan_id);
//   if (!plan) throw new Error('RD Plan not found');

//   const duration = Number(plan.duration_months || 12);
//   const installmentAmount = Number(rdCustomer.installment_amount);
//   if (!installmentAmount || installmentAmount <= 0) throw new Error('Invalid installment_amount');

//   const first = computeFirstPaymentDateFromInvestment(rdCustomer.investment_date);
//   const iso = (d) => d.toISOString().split('T')[0];

//   const installments = [];

//   for (let i = 1; i <= duration; i++) {
//     installments.push({
//       rd_customer_id: rdCustomer._id,
//       installment_no: i,
//       amount: installmentAmount,
//       payment_date: iso(addMonths(first, i - 1)),
//       is_paid: false,
//       is_final_payout: false,
//       created_at: new Date()
//     });
//   }

//   // final payout (principal sum + return) one month after last installment
//   const totalPrincipal = installmentAmount * duration;
//   const totalReturn = totalPrincipal * ((plan.return_percentage || 0) / 100);
//   const finalPayoutAmount = parseFloat((totalPrincipal + totalReturn).toFixed(2));

//   installments.push({
//     rd_customer_id: rdCustomer._id,
//     installment_no: duration + 1,
//     amount: finalPayoutAmount,
//     payment_date: iso(addMonths(first, duration)),
//     is_paid: false,
//     is_final_payout: true,
//     created_at: new Date()
//   });

//   const data = await RdInstallment.insertMany(installments);
//   await auditLog('rd_installments', rdCustomer._id, 'GENERATE_INSTALLMENTS', null, { count: data.length, first_payment: iso(first) }, null);
//   return data;
// }


function getRdMonthlyPayoutDate(startDate, monthOffset, payoutDay) {
  const year = startDate.getUTCFullYear();
  const month = startDate.getUTCMonth() + monthOffset;

  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(payoutDay, lastDayOfMonth);

  return new Date(Date.UTC(year, month, day));
}


// async function generateRdInstallments(rdCustomer) {
//   const plan = await RdPlan.findById(rdCustomer.plan_id);
//   if (!plan) throw new Error('RD Plan not found');

//   const firstDate = computeFirstPaymentDateFromInvestment(rdCustomer.investment_date);
//   const installments = [];

//   for (let i = 1; i <= plan.duration_months; i++) {
//     installments.push({
//       rd_customer_id: rdCustomer._id,
//       installment_no: i,
//       amount: rdCustomer.installment_amount,
//       payment_date: _iso(addMonths(firstDate, i - 1)),
//       is_paid: false,
//       created_at: new Date()
//     });
//   }

//   await RdInstallment.insertMany(installments);
// }


async function generateRdInstallments(rdCustomer) {
  const plan = await RdPlan.findById(rdCustomer.plan_id);
  if (!plan) throw new Error('RD Plan not found');

  const baseDate = new Date(rdCustomer.investment_date || new Date());
  const investDay = baseDate.getDate();

  // Same rule as Generate Payments
  const payoutDay = investDay <= 15 ? 15 : 30;

  // First payout starts next month
  const firstPayoutMonth = baseDate.getMonth() + 1;
  const firstPayoutYear = baseDate.getFullYear();

  // Handle February for first payout
  let firstPayoutDay = payoutDay;
  if (payoutDay === 30 && firstPayoutMonth === 1) {
    firstPayoutDay = new Date(
      firstPayoutYear,
      firstPayoutMonth + 1,
      0
    ).getDate();
  }

  const firstPayoutDate = new Date(
    Date.UTC(firstPayoutYear, firstPayoutMonth, firstPayoutDay)
  );

  const installments = [];
  const iso = (d) => d.toISOString().split('T')[0];

  for (let i = 1; i <= plan.duration_months; i++) {
    installments.push({
      rd_customer_id: rdCustomer._id,
      installment_no: i,
      amount: rdCustomer.installment_amount,
      payment_date: iso(
        getRdMonthlyPayoutDate(firstPayoutDate, i - 1, payoutDay)
      ),
      is_paid: false,
      created_at: new Date(),
    });
  }

  await RdInstallment.insertMany(installments);
}



// async function generateRdFinalPayment(rdCustomer) {
//   const plan = await RdPlan.findById(rdCustomer.plan_id);
//   if (!plan) throw new Error('Plan not found');

//   const principal = rdCustomer.installment_amount * plan.duration_months;
//   const returns = principal * (plan.return_percentage / 100);
//   const totalAmount = Number((principal + returns).toFixed(2));

//   const maturityDate = _iso(
//     addMonths(new Date(rdCustomer.investment_date), plan.duration_months + 1)
//   );

//   await RdPayment.create({
//     rd_customer_id: rdCustomer._id,
//     scheduled_payment_date: maturityDate,
//     amount: totalAmount,
//     payment_method: 'None',
//     is_paid: false,
//     created_at: new Date()
//   });
// }



async function generateRdFinalPayment(rdCustomer) {
  const plan = await RdPlan.findById(rdCustomer.plan_id);
  if (!plan) throw new Error('Plan not found');

  /* ================= AMOUNT CALCULATION ================= */
  const principal = rdCustomer.installment_amount * plan.duration_months;
  const returns = principal * (plan.return_percentage / 100);
  const totalAmount = Number((principal + returns).toFixed(2));

  /* ================= DATE LOGIC (SAME AS INSTALLMENTS) ================= */
  const investmentDate = new Date(rdCustomer.investment_date);
  const investmentDay = investmentDate.getDate();

  // 15 / 30 rule
  let payoutDay;
  if (investmentDay <= 15) {
    payoutDay = 15;
  } else {
    const maturityMonth = investmentDate.getMonth() + plan.duration_months;
    const isFebruary = maturityMonth % 12 === 1; // Feb (0=Jan,1=Feb)
    payoutDay = isFebruary
      ? new Date(
          investmentDate.getFullYear(),
          maturityMonth + 1,
          0
        ).getDate()
      : 30;
  }

  // maturity month
  const maturityBase = addMonths(investmentDate, plan.duration_months);

  const maturityDate = new Date(
    maturityBase.getFullYear(),
    maturityBase.getMonth(),
    payoutDay
  );

  /* ================= CREATE FINAL PAYMENT ================= */
  await RdPayment.create({
    rd_customer_id: rdCustomer._id,
    scheduled_payment_date: maturityDate.toISOString().split('T')[0],
    amount: totalAmount,
    payment_method: 'None',
    is_paid: false,
    created_at: new Date()
  });
}


// Generate direct agent payment for a payment (direct agent only)
// async function generateRdAgentPaymentOnPayment(rdCustomerId, installment, rdPaymentRecord) {
//   const rdCust = await RdCustomer.findById(rdCustomerId);
//   if (!rdCust) return null;
//   if (!rdCust.agent_id) return null;

//   const agent = await Agent.findById(rdCust.agent_id);
//   if (!agent || agent.approval_status !== 'approved') return null;

//   const commissionPercent = agent.commission_percentage || 0;
//   const payable = (installment.amount * commissionPercent) / 100;

//   if (payable <= 0) return null;

//   const paymentDate = rdPaymentRecord.payment_date || _iso(new Date());

//   const payDoc = await RdAgentPayment.create({
//     agent_id: agent._id,
//     rd_customer_id: rdCust._id,
//     installment_id: installment._id,
//     amount: parseFloat(payable.toFixed(2)),
//     payment_date: paymentDate,
//     is_paid: false,
//     created_at: new Date()
//   });

//   await auditLog('rd_agent_payments', rdCust._id, 'GENERATE_AGENT_PAYMENT', null, payDoc.toObject(), null);
//   return payDoc;
// }

async function generateRdAgentPayments(rdCustomer, amount, installmentId) {
  if (!rdCustomer.agent_id) return;

  let agent = await Agent.findById(rdCustomer.agent_id);
  let lastPercent = 0;

  while (agent) {
    const diff = agent.commission_percentage - lastPercent;
    if (diff > 0) {
      await RdAgentPayment.create({
        agent_id: agent._id,
        rd_customer_id: rdCustomer._id,
        installment_id: installmentId,
        amount: Number(((amount * diff) / 100).toFixed(2)),
        payment_date: _iso(new Date()),
        is_paid: false,
        created_at: new Date()
      });
    }

    lastPercent = agent.commission_percentage;
    agent = agent.parent_agent_id
      ? await Agent.findById(agent.parent_agent_id)
      : null;
  }
}


// Mark installment as paid (attachments allowed) — now also creates RdPayment ledger and agent payment
// async function markRdInstallmentPaid(installmentId, body = {}, files = [], performedBy = null) {
//   // validate input shape with zod (optional)
//   try {
//     RdInstallmentMarkPaidSchema.parse({
//       method: body.method,
//       transaction_id: body.transaction_id,
//       cheque_number: body.cheque_number
//     });
//   } catch (err) {
//     // continue; we'll still allow but validation error will be returned downstream if needed
//   }

//   const images = files && files.length ? await uploadImages(files) : [];
//   const oldInstallment = await RdInstallment.findById(installmentId);
//   if (!oldInstallment) throw new Error('Installment not found');

//   if (oldInstallment.is_paid) {
//     // Return early: already paid — but still create RdPayment only if missing? We'll return existing installment
//     return oldInstallment;
//   }

//   // Update installment to paid
//   const update = {
//     is_paid: true,
//     paid_at: new Date(),
//     payment_method: body.method || oldInstallment.payment_method || 'Online',
//     transaction_id: body.transaction_id || oldInstallment.transaction_id,
//     cheque_number: body.cheque_number || oldInstallment.cheque_number,
//     images: [...(oldInstallment.images || []), ...images],
//     updated_at: new Date()
//   };

//   const installment = await RdInstallment.findByIdAndUpdate(installmentId, update, { new: true });
//   await auditLog('rd_installments', installment._id, 'MARK_PAID', oldInstallment.toObject(), installment.toObject(), performedBy || null);

//   // Create RdPayment ledger record using installment.scheduled payment_date
//   const paymentRecord = await RdPayment.create({
//     rd_customer_id: installment.rd_customer_id,
//     installment_id: installment._id,
//     scheduled_payment_date: installment.payment_date,
//     payment_type: body.method || 'Cash',
//     transaction_id: body.transaction_id || null,
//     cheque_number: body.cheque_number || null,
//     is_paid: true,
//     payment_date: _iso(new Date()), // actual received date
//     amount: body.amount ? Number(body.amount) : installment.amount, // prefer amount passed, else installment.amount
//     images,
//     created_at: new Date()
//   });

//   await auditLog('rd_payments', paymentRecord._id, 'CREATE', null, paymentRecord.toObject(), performedBy || null);

//   // Generate agent payment (direct agent only) based on this payment
//   const agentPayment = await generateRdAgentPaymentOnPayment(installment.rd_customer_id, installment, paymentRecord);

//   // After payment, check if all installments (including final) are paid — settle customer if yes
//   const all = await RdInstallment.find({ rd_customer_id: installment.rd_customer_id });
//   const allPaid = all.every(s => s.is_paid);
//   if (allPaid) {
//     await RdCustomer.findByIdAndUpdate(installment.rd_customer_id, { approval_status: 'settled', updated_at: new Date() });
//     await auditLog('rd_customers', installment.rd_customer_id, 'SETTLED', null, { approval_status: 'settled' }, performedBy || null);
//   }

//   return {
//     installment,
//     rd_payment: paymentRecord,
//     rd_agent_payment: agentPayment || null
//   };
// }

// async function markRdInstallmentPaid(installmentId, body = {}, files = [], performedBy = null) {
//   const images = files.length ? await uploadImages(files) : [];

//   const installment = await RdInstallment.findById(installmentId);
//   if (!installment) throw new Error('Installment not found');
//   if (installment.is_paid) return installment;

//   installment.is_paid = true;
//   installment.paid_at = new Date();
//   installment.payment_method = body.method || 'Online';
//   installment.transaction_id = body.transaction_id;
//   installment.cheque_number = body.cheque_number;
//   installment.images = [...(installment.images || []), ...images];
//   installment.updated_at = new Date();
//   await installment.save();

//   await auditLog(
//     'rd_installments',
//     installment._id,
//     'MARK_PAID',
//     null,
//     installment.toObject(),
//     performedBy
//   );

//   // Agent commission ONLY for installments
//   const customer = await RdCustomer.findById(installment.rd_customer_id);
//   await generateRdAgentPayments(customer, installment.amount, installment._id);

//   return installment;
// }

// async function markRdInstallmentPaid(installmentId, body, files, userId) {
//   const installment = await RdInstallment.findById(installmentId);
//   if (!installment) {
//     throw new Error("Installment not found");
//   }

//   if (installment.is_paid) {
//     throw new Error("Installment already marked as paid");
//   }

//   const paidAt = new Date(body.paid_at || new Date());
//   const scheduledDate = new Date(installment.payment_date);

//   // Upload images if any
//   const images = files?.length ? await uploadImages(files) : [];

//   // Mark installment as paid
//   installment.is_paid = true;
//   installment.paid_at = paidAt;
//   installment.payment_method = body.method || "None";
//   installment.transaction_id = body.transaction_id || null;
//   installment.images = [...(installment.images || []), ...images];
//   installment.updated_at = new Date();
//   await installment.save();

//   // -------------------------------
//   // CASE 2: Late payment handling
//   // -------------------------------
//   if (paidAt > scheduledDate) {
//     const customerId = installment.rd_customer_id;

//     // Fetch all installments of this customer
//     const allInstallments = await RdInstallment.find({
//       rd_customer_id: customerId,
//     });

//     // Calculate totals
//     const totalAmount = allInstallments.reduce(
//       (sum, i) => sum + (i.amount || 0),
//       0
//     );

//     const paidAmount = allInstallments
//       .filter((i) => i.is_paid)
//       .reduce((sum, i) => sum + (i.amount || 0), 0);

//     const unpaidAmount = totalAmount - paidAmount;

//     // 3️⃣ Update / create RD Payment entry
//     await RdPayment.findOneAndUpdate(
//       { rd_customer_id: customerId },
//       {
//         rd_customer_id: customerId,
//         amount: totalAmount, // overall installment amount
//         is_paid: unpaidAmount === 0,
//         payment_date: paidAt.toISOString().split("T")[0],
//         payment_method: body.method || "None",
//         transaction_id: body.transaction_id || null,
//         images,
//         updated_at: new Date(),
//       },
//       { upsert: true, new: true }
//     );
//   }
//   const customer = await RdCustomer.findById(installment.rd_customer_id);
//   await generateRdAgentPayments(customer, installment.amount, installment._id);

//   // Audit log
//   await auditLog(
//     "rd_installments",
//     installment._id,
//     "MARK_PAID",
//     null,
//     installment.toObject(),
//     userId
//   );

//   return {
//     installment_id: installment._id,
//     is_paid: true,
//     paid_at: installment.paid_at,
//   };
// }


async function markRdInstallmentPaid(installmentId, body, files, userId) {
  const installment = await RdInstallment.findById(installmentId);
  if (!installment) {
    throw new Error("Installment not found");
  }

  if (installment.is_paid) {
    throw new Error("Installment already marked as paid");
  }

  const paidAt = new Date(body.paid_at || new Date());
  const scheduledDate = new Date(installment.payment_date);

  // Upload images if any
  const images = files?.length ? await uploadImages(files) : [];

  // -------------------------------
  // 1️⃣ Mark installment as paid
  // -------------------------------
  installment.is_paid = true;
  installment.paid_at = paidAt;
  installment.payment_method = body.method || "None";
  installment.transaction_id = body.transaction_id || null;
  installment.images = [...(installment.images || []), ...images];
  installment.updated_at = new Date();
  await installment.save();

  // -------------------------------
  // 2️⃣ Late payment handling (NEW)
  // -------------------------------
  if (paidAt > scheduledDate) {
    const customerId = installment.rd_customer_id;

    // 🔒 Prevent duplicate penalty for same installment
    const existingPenalty = await RdPenalty.findOne({
      installment_id: installment._id,
    });

    if (!existingPenalty) {
      // 2️⃣.1 Create penalty entry
      const penalty = await RdPenalty.create({
        rd_customer_id: customerId,
        installment_id: installment._id,
        penalty_month: paidAt.toISOString().slice(0, 7), // YYYY-MM
        penalty_amount: 1000,
        reason: "Late installment payment",
      });

      // AUDIT LOG – Penalty creation
      await auditLog(
        "rd_penalties",
        penalty._id,
        "CREATE_PENALTY",
        null,
        penalty.toObject(),
        userId
      );

      // 2️⃣.2 Deduct ₹1000 from maturity payment
      const maturityPayment = await RdPayment.findOne({
        rd_customer_id: customerId,
        is_paid: false, // maturity entry
      });

      if (maturityPayment) {
        const oldAmount = maturityPayment.amount;

        maturityPayment.amount = Math.max(0, oldAmount - 1000);
        maturityPayment.updated_at = new Date();
        await maturityPayment.save();

        // AUDIT LOG – Maturity deduction
        await auditLog(
          "rd_payments",
          maturityPayment._id,
          "PENALTY_DEDUCTION",
          { amount: oldAmount },
          { amount: maturityPayment.amount },
          userId
        );
      }
    }
  }

  // -------------------------------
  // 3️⃣ Agent commission logic (UNCHANGED)
  // -------------------------------
  const customer = await RdCustomer.findById(installment.rd_customer_id);
  await generateRdAgentPayments(customer, installment.amount, installment._id);

  // -------------------------------
  // 4️⃣ Audit log – Installment paid
  // -------------------------------
  await auditLog(
    "rd_installments",
    installment._id,
    "MARK_PAID",
    null,
    installment.toObject(),
    userId
  );

  return {
    installment_id: installment._id,
    is_paid: true,
    paid_at: installment.paid_at,
  };
}




// ------------------- RD PLANS API -------------------

// Create RD plan
app.post('/rd/plans', authMiddleware, rbacMiddleware(['super_admin']), async (req, res) => {
  try {
    const body = RdPlanCreateSchema.parse(req.body);
    const doc = await RdPlan.create({ ...body, created_at: new Date(), updated_at: new Date() });
    await auditLog('rd_plans', doc._id, 'CREATE', null, doc.toObject(), req.user.user_id);
    res.json({ data: doc, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { code: 'RD_PLAN_CREATE_ERROR', message: err.message } });
  }
});

// List RD plans
app.get('/rd/plans', authMiddleware, async (req, res) => {
  try {
    const items = await RdPlan.find({}).sort({ created_at: -1 });
    res.json({ data: { items, total: items.length }, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { code: 'RD_PLAN_LIST_ERROR', message: err.message } });
  }
});

// Activate / Deactivate plans
app.patch('/rd/plans/:id/activate', authMiddleware, rbacMiddleware(['super_admin']), async (req, res) => {
  try {
    const plan = await RdPlan.findByIdAndUpdate(req.params.id, { is_active: true, updated_at: new Date() }, { new: true });
    if (!plan) return res.status(404).json({ data: null, error: { code: 'NOT_FOUND' } });
    await auditLog('rd_plans', plan._id, 'ACTIVATE', null, plan.toObject(), req.user.user_id);
    res.json({ data: plan, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { code: 'RD_PLAN_ACTIVATE_ERROR', message: err.message } });
  }
});

app.patch('/rd/plans/:id/deactivate', authMiddleware, rbacMiddleware(['super_admin']), async (req, res) => {
  try {
    const plan = await RdPlan.findByIdAndUpdate(req.params.id, { is_active: false, updated_at: new Date() }, { new: true });
    if (!plan) return res.status(404).json({ data: null, error: { code: 'NOT_FOUND' } });
    await auditLog('rd_plans', plan._id, 'DEACTIVATE', null, plan.toObject(), req.user.user_id);
    res.json({ data: plan, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { code: 'RD_PLAN_DEACTIVATE_ERROR', message: err.message } });
  }
});

// ------------------- RD CUSTOMERS API -------------------
app.get(
  '/rd/customers',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin', 'office_staff']),
  async (req, res) => {
    try {
      const customers = await RdCustomer.find({}).lean();

      res.json({
        data: {
          items: customers,
          total: customers.length
        },
        error: null
      });
    } catch (err) {
      res.status(400).json({
        data: null,
        error: {
          code: 'RD_CUSTOMER_LIST_ERROR',
          message: err.message
        }
      });
    }
  }
);


// Create RD customer
app.post('/rd/customers', authMiddleware, rbacMiddleware(['office_staff','manager','super_admin']), upload.array('files'), async (req, res) => {
  try {
    const raw = JSON.parse(req.body.data || '{}');
    const body = RdCustomerCreateSchema.parse(raw);

    // Ensure investment_date default if not provided
    if (!body.investment_date || body.investment_date.trim() === '') {
      body.investment_date = new Date().toISOString().split('T')[0];
    }

    const images = req.files ? await uploadImages(req.files) : [];

    const doc = await RdCustomer.create({
      ...body,
      images,
      submitted_by: req.user.user_id,
      approval_status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    });

    await auditLog('rd_customers', doc._id, 'CREATE', null, doc.toObject(), req.user.user_id);
    res.json({ data: doc, error: null });
  } catch (err) {
    console.error('RD Customer create error:', err);
    res.status(400).json({ data: null, error: { code: 'RD_CUSTOMER_CREATE_ERROR', message: err.message } });
  }
});

// Approve RD customer -> generate installments & final payout
app.post('/rd/customers/:id/approve', authMiddleware, rbacMiddleware(['manager','super_admin']), async (req, res) => {
  try {
    const { comments } = req.body;
    const oldData = await RdCustomer.findById(req.params.id);
    if (!oldData) throw new Error('RD Customer not found');

    // Ensure investment_date exists
    const investmentDate = oldData.investment_date && oldData.investment_date.trim() !== ''
      ? oldData.investment_date
      : new Date().toISOString().split('T')[0];

    const data = await RdCustomer.findByIdAndUpdate(req.params.id, {
      approval_status: 'approved',
      reviewed_by: req.user.user_id,
      review_comments: comments,
      approved_at: new Date(),
      investment_date: investmentDate,
      updated_at: new Date()
    }, { new: true });

    // generate installments (will use plan.duration_months)
    await generateRdInstallments(data);
    await generateRdFinalPayment(data);

    await auditLog('rd_customers', data._id, 'APPROVE', oldData?.toObject(), data.toObject(), req.user.user_id);
    res.json({ data: { success: true, updated: data }, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { code: 'RD_APPROVE_ERROR', message: err.message } });
  }
});

// Reject RD customer
app.post('/rd/customers/:id/reject', authMiddleware, rbacMiddleware(['manager','super_admin']), async (req, res) => {
  try {
    const { comments } = req.body;
    const oldData = await RdCustomer.findById(req.params.id);
    if (!oldData) throw new Error('RD Customer not found');
    const data = await RdCustomer.findByIdAndUpdate(req.params.id, {
      approval_status: 'rejected',
      reviewed_by: req.user.user_id,
      review_comments: comments,
      updated_at: new Date()
    }, { new: true });
    await auditLog('rd_customers', data._id, 'REJECT', oldData?.toObject(), data.toObject(), req.user.user_id);
    res.json({ data: { success: true, updated: data }, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { code: 'RD_REJECT_ERROR', message: err.message } });
  }
});

// Settle RD customer
app.post('/rd/customers/:id/settle', authMiddleware, rbacMiddleware(['manager','super_admin']), async (req, res) => {
  try {
    const rd = await RdCustomer.findById(req.params.id);
    if (!rd) return res.status(404).json({ data: null, error: { code: 'NOT_FOUND' }});
    if (rd.approval_status === 'settled') return res.status(400).json({ data: null, error: { code: 'ALREADY_SETTLED' }});

    rd.approval_status = 'settled';
    rd.updated_at = new Date();
    await rd.save();

    // mark all installments paid
    const result = await RdInstallment.updateMany({ rd_customer_id: req.params.id }, { $set: { is_paid: true, paid_at: new Date(), payment_method: 'None' } });

    await auditLog('rd_customers', rd._id, 'SETTLE', null, { updated: true }, req.user.user_id);

    res.json({ data: { success: true, updated: rd, installments_updated: result.modifiedCount }, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { code: 'RD_SETTLE_ERROR', message: err.message } });
  }
});

// RD customer details with installments & settlement summary
app.get(
  '/rd/customers/:id',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin', 'office_staff']),
  async (req, res) => {
    try {
      const id = req.params.id;

      /* ================= RD CUSTOMER ================= */
      const rd = await RdCustomer.findById(id)
        .populate({
          path: 'agent_id',
          select: 'first_name last_name email phone commission_percentage'
        })
        .lean();

      if (!rd) {
        return res.status(404).json({
          data: null,
          error: { code: 'NOT_FOUND' }
        });
      }

      /* ================= RD PLAN ================= */
      const plan = await RdPlan.findById(rd.plan_id)
        .select('name return_percentage duration_months')
        .lean();

      /* ================= INSTALLMENTS ================= */
      const installments = await RdInstallment.find({
        rd_customer_id: id
      })
        .sort({ payment_date: 1 })
        .lean();

      const paidInstallments = installments.filter(i => i.is_paid);

      const totalPaid = paidInstallments.reduce(
        (sum, i) => sum + (i.amount || 0),
        0
      );

      /* ================= DUE CALCULATION ================= */
      const installmentAmount = rd.installment_amount || 0;
      const durationMonths = plan?.duration_months || 0;

      const totalExpected = installmentAmount * durationMonths;
      const totalDue = totalExpected - totalPaid;
      const settlement_amount = totalPaid;

      /* ================= RD PAYMENTS ================= */
      const payments = await RdPayment.find({
        rd_customer_id: id
      })
        .sort({ payment_date: 1 })
        .lean();

      const paymentDetails = payments.map(p => ({
        _id: p._id,
        amount: p.amount || 0,
        scheduled_payment_date: p.scheduled_payment_date || null,
        payment_date: p.payment_date || null,
        payment_method: p.payment_method || 'None',
        transaction_id: p.transaction_id || null,
        cheque_number: p.cheque_number || null,
        is_paid: p.is_paid || false,
        images: p.images || [],
        created_at: p.created_at
      }));

      /* ================= RESPONSE ================= */
      res.json({
        data: {
          rd_customer: rd,

          plan_details: {
            plan_id: plan?._id || null,
            name: plan?.name || null,
            duration_months: durationMonths,
            return_percentage: plan?.return_percentage || 0,
            installment_amount: installmentAmount,
            total_expected_amount: totalExpected
          },

          installments,

          payment_table: paymentDetails, // 👈 RD PAYMENT TABLE (READY FOR UI)

          summary: {
            total_expected: totalExpected,
            total_paid: totalPaid,
            total_due: totalDue,
            installments_count: durationMonths,
            paid_count: paidInstallments.length,
            unpaid_count: durationMonths - paidInstallments.length
          },

          statement: {
            statement_amount: totalPaid
          },

          settlement: {
            total_paid_amount: totalPaid,
            due_amount: totalDue,
            settlement_amount
          }
        },
        error: null
      });
    } catch (err) {
      res.status(400).json({
        data: null,
        error: {
          code: 'RD_CUSTOMER_DETAILS_ERROR',
          message: err.message
        }
      });
    }
  }
);


// app.patch(
//   '/rd/customers/:id',
//   authMiddleware,
//   rbacMiddleware(['manager', 'super_admin', 'office_staff']),
//   async (req, res) => {
//     try {
//       const { id } = req.params;

//       const oldCustomer = await RdCustomer.findById(id);
//       if (!oldCustomer) {
//         return res.status(404).json({
//           data: null,
//           error: { code: 'NOT_FOUND', message: 'RD customer not found' }
//         });
//       }

//       const updatedCustomer = await RdCustomer.findByIdAndUpdate(
//         id,
//         { ...req.body, updated_at: new Date() },
//         { new: true }
//       ).lean();

//       res.json({
//         data: updatedCustomer,
//         error: null
//       });
//     } catch (err) {
//       res.status(400).json({
//         data: null,
//         error: {
//           code: 'RD_CUSTOMER_UPDATE_ERROR',
//           message: err.message
//         }
//       });
//     }
//   }
// );


app.patch(
  '/rd/customers/:id',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin', 'office_staff']),
  upload.array('files'), // ✅ enable image upload
  async (req, res) => {
    try {
      const { id } = req.params;

      // 1. Find existing RD customer
      const oldCustomer = await RdCustomer.findById(id);
      if (!oldCustomer) {
        return res.status(404).json({
          data: null,
          error: { code: 'NOT_FOUND', message: 'RD customer not found' }
        });
      }

      // 2. Parse form-data JSON
      const raw = JSON.parse(req.body.data || '{}');

      // 3. Validate partial update
      const body = RdCustomerCreateSchema.partial().parse(raw);

      // 4. Upload new images (if any)
      const newImages = req.files ? await uploadImages(req.files) : [];

      // 5. Merge old + new images
      const images = [...(oldCustomer.images || []), ...newImages];

      // 6. Update customer
      const updatedCustomer = await RdCustomer.findByIdAndUpdate(
        id,
        {
          ...body,
          images,
          updated_at: new Date()
        },
        { new: true }
      ).lean();

      // 7. Audit log
      await auditLog(
        'rd_customers',
        id,
        'UPDATE',
        oldCustomer.toObject(),
        updatedCustomer,
        req.user.user_id
      );

      // 8. Response
      res.json({
        data: updatedCustomer,
        error: null
      });
    } catch (err) {
      console.error('RD Customer update error:', err);
      res.status(400).json({
        data: null,
        error: {
          code: 'RD_CUSTOMER_UPDATE_ERROR',
          message: err.message
        }
      });
    }
  }
);



app.get(
  '/rd/customers/:id/download/excel',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      const { id } = req.params;

      /* ================= FETCH DATA ================= */
      const customer = await RdCustomer.findById(id).lean();
      if (!customer) throw new Error('RD Customer not found');

      const plan = customer.plan_id
        ? await RdPlan.findById(customer.plan_id).lean()
        : null;

      const agent = customer.agent_id
        ? await Agent.findById(customer.agent_id).lean()
        : null;

      const installments = await RdInstallment.find({
        rd_customer_id: customer._id
      }).sort({ installment_no: 1 }).lean();

      const payments = await RdPayment.find({
        rd_customer_id: customer._id
      }).sort({ scheduled_payment_date: 1 }).lean();

      /* ================= EXCEL ================= */
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('RD Customer Full Details');

      /* ---------- SIMPLE STYLES ---------- */
      const headerStyle = {
        font: { bold: true },
        alignment: { horizontal: 'center' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      };

      const cellStyle = {
        alignment: { horizontal: 'center' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      };

      let row = 1;

      /* ================= CUSTOMER DETAILS ================= */
      sheet.mergeCells(`A${row}:B${row}`);
      sheet.getCell(`A${row}`).value = 'CUSTOMER DETAILS';
      sheet.getCell(`A${row}`).font = { bold: true };
      row += 2;

      sheet.addRow(['Field', 'Value']);
      sheet.getRow(row).eachCell(c => Object.assign(c.style, headerStyle));
      row++;

      Object.entries(customer).forEach(([key, value]) => {
        sheet.addRow([key, value ?? '']);
        sheet.getRow(row).eachCell(c => Object.assign(c.style, cellStyle));
        row++;
      });

      row += 2;

      /* ================= PLAN DETAILS ================= */
      sheet.mergeCells(`A${row}:E${row}`);
      sheet.getCell(`A${row}`).value = 'PLAN DETAILS';
      sheet.getCell(`A${row}`).font = { bold: true };
      row += 2;

      sheet.addRow(['Plan ID', 'Plan Name', 'Duration (Months)', 'Return %', 'Active']);
      sheet.getRow(row).eachCell(c => Object.assign(c.style, headerStyle));
      row++;

      if (plan) {
        sheet.addRow([
          plan._id,
          plan.name,
          plan.duration_months,
          plan.return_percentage,
          plan.is_active ? 'YES' : 'NO'
        ]);
        sheet.getRow(row).eachCell(c => Object.assign(c.style, cellStyle));
        row++;
      }

      row += 2;

      /* ================= AGENT DETAILS ================= */
      sheet.mergeCells(`A${row}:E${row}`);
      sheet.getCell(`A${row}`).value = 'AGENT DETAILS';
      sheet.getCell(`A${row}`).font = { bold: true };
      row += 2;

      sheet.addRow(['Agent ID', 'Name', 'Email', 'Phone', 'Commission %']);
      sheet.getRow(row).eachCell(c => Object.assign(c.style, headerStyle));
      row++;

      if (agent) {
        sheet.addRow([
          agent._id,
          `${agent.first_name || ''} ${agent.last_name || ''}`,
          agent.email,
          agent.phone,
          agent.commission_percentage
        ]);
        sheet.getRow(row).eachCell(c => Object.assign(c.style, cellStyle));
        row++;
      }

      row += 2;

      /* ================= INSTALLMENTS ================= */
      sheet.mergeCells(`A${row}:G${row}`);
      sheet.getCell(`A${row}`).value = 'INSTALLMENTS';
      sheet.getCell(`A${row}`).font = { bold: true };
      row += 2;

      sheet.addRow([
        'Installment No',
        'Amount',
        'Payment Date',
        'Paid',
        'Paid At',
        'Method',
        'Transaction ID'
      ]);
      sheet.getRow(row).eachCell(c => Object.assign(c.style, headerStyle));
      row++;

      installments.forEach(i => {
        sheet.addRow([
          i.installment_no,
          i.amount,
          i.payment_date,
          i.is_paid ? 'YES' : 'NO',
          i.paid_at,
          i.payment_method,
          i.transaction_id
        ]);
        sheet.getRow(row).eachCell(c => Object.assign(c.style, cellStyle));
        row++;
      });

      row += 2;

      /* ================= PAYMENTS ================= */
      sheet.mergeCells(`A${row}:F${row}`);
      sheet.getCell(`A${row}`).value = 'PAYMENTS';
      sheet.getCell(`A${row}`).font = { bold: true };
      row += 2;

      sheet.addRow([
        'Scheduled Date',
        'Payment Date',
        'Amount',
        'Method',
        'Transaction ID',
        'Paid'
      ]);
      sheet.getRow(row).eachCell(c => Object.assign(c.style, headerStyle));
      row++;

      payments.forEach(p => {
        sheet.addRow([
          p.scheduled_payment_date,
          p.payment_date,
          p.amount,
          p.payment_method,
          p.transaction_id,
          p.is_paid ? 'YES' : 'NO'
        ]);
        sheet.getRow(row).eachCell(c => Object.assign(c.style, cellStyle));
        row++;
      });

      /* ================= COLUMN WIDTH ================= */
      sheet.columns.forEach(col => {
        if (!col.width) col.width = 22;
      });

      /* ================= SEND FILE ================= */
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=rd_customer_${id}_full_details.xlsx`
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      res.status(400).json({
        data: null,
        error: {
          code: 'RD_CUSTOMER_EXCEL_ERROR',
          message: err.message
        }
      });
    }
  }
);


app.get(
  '/rd/customers/download/full-excel',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      const customers = await RdCustomer.find({}).lean();

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('RD Customers');

      // Header
      sheet.columns = [
        { header: 'Customer ID', key: 'customer_id', width: 25 },
        { header: 'First Name', key: 'first_name', width: 15 },
        { header: 'Last Name', key: 'last_name', width: 15 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Nominee Name', key: 'nominee_name', width: 18 },
        { header: 'Nominee PAN/Aadhar', key: 'nominee_pan_aadhar', width: 22 },

        { header: 'Plan ID', key: 'plan_id', width: 25 },
        { header: 'Plan Name', key: 'plan_name', width: 20 },
        { header: 'Return %', key: 'return_percentage', width: 12 },
        { header: 'Duration (Months)', key: 'duration_months', width: 18 },
        { header: 'Installment Amount', key: 'installment_amount', width: 18 },

        { header: 'Total Installments', key: 'total_installments', width: 18 },
        { header: 'Paid Installments', key: 'paid_installments', width: 18 },
        { header: 'Unpaid Installments', key: 'unpaid_installments', width: 20 },

        { header: 'Total Payments', key: 'total_payments', width: 18 },
        { header: 'Total Paid Amount', key: 'total_paid_amount', width: 20 },

        { header: 'Total Expected Amount', key: 'total_expected_amount', width: 22 },
        { header: 'Due Amount', key: 'due_amount', width: 18 },
        { header: 'Settlement Amount', key: 'settlement_amount', width: 20 },

        { header: 'Approval Status', key: 'approval_status', width: 15 },
        { header: 'Submitted By', key: 'submitted_by', width: 22 },
        { header: 'Reviewed By', key: 'reviewed_by', width: 22 },
        { header: 'Review Comments', key: 'review_comments', width: 30 },
        { header: 'Approved At', key: 'approved_at', width: 20 },
        { header: 'Created At', key: 'created_at', width: 20 }
      ];

      for (const rd of customers) {
        const plan = await RdPlan.findById(rd.plan_id).lean();
        const installments = await RdInstallment.find({ rd_customer_id: rd._id }).lean();
        const payments = await RdPayment.find({ rd_customer_id: rd._id }).lean();

        const paidInstallments = installments.filter(i => i.is_paid);
        const totalPaid = paidInstallments.reduce((s, i) => s + (i.amount || 0), 0);

        const installmentAmount = rd.installment_amount || 0;
        const durationMonths = plan?.duration_months || 0;
        const totalExpected = installmentAmount * durationMonths;
        const totalDue = totalExpected - totalPaid;

        sheet.addRow({
          customer_id: rd._id,
          first_name: rd.first_name,
          last_name: rd.last_name,
          email: rd.email,
          phone: rd.phone,
          nominee_name: rd.nominee_name,
          nominee_pan_aadhar: rd.nominee_pan_aadhar,

          plan_id: plan?._id,
          plan_name: plan?.name,
          return_percentage: plan?.return_percentage,
          duration_months: durationMonths,
          installment_amount: installmentAmount,

          total_installments: durationMonths,
          paid_installments: paidInstallments.length,
          unpaid_installments: durationMonths - paidInstallments.length,

          total_payments: payments.length,
          total_paid_amount: totalPaid,

          total_expected_amount: totalExpected,
          due_amount: totalDue,
          settlement_amount: totalPaid,

          approval_status: rd.approval_status,
          submitted_by: rd.submitted_by,
          reviewed_by: rd.reviewed_by,
          review_comments: rd.review_comments,
          approved_at: rd.approved_at,
          created_at: rd.created_at
        });
      }

      res.setHeader(
        'Content-Disposition',
        'attachment; filename=rd_customers_full_details.xlsx'
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      res.status(400).json({
        data: null,
        error: {
          code: 'RD_CUSTOMER_EXCEL_DOWNLOAD_ERROR',
          message: err.message
        }
      });
    }
  }
);





app.get(
  '/rd/customers/:id/settlement-summary',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin', 'office_staff']),
  async (req, res) => {
    try {
      const { id } = req.params;

      /* ================= RD CUSTOMER ================= */
      const rd = await RdCustomer.findById(id).lean();
      if (!rd) {
        return res.status(404).json({
          data: null,
          error: { code: 'NOT_FOUND', message: 'RD customer not found' }
        });
      }

      /* ================= RD PLAN ================= */
      const plan = await RdPlan.findById(rd.plan_id)
        .select('name duration_months return_percentage')
        .lean();

      const installmentAmount = rd.installment_amount || 0;
      const durationMonths = plan?.duration_months || 0;

      /* ================= INSTALLMENTS ================= */
      const installments = await RdInstallment.find({
        rd_customer_id: id
      }).lean();

      const paidInstallments = installments.filter(i => i.is_paid);
      const unpaidInstallments = installments.filter(i => !i.is_paid);

      const totalPaid = paidInstallments.reduce(
        (sum, i) => sum + (i.amount || 0),
        0
      );

      /* ================= SETTLEMENT CALCULATION ================= */
      const totalExpected = installmentAmount * durationMonths;
      const totalDue = totalExpected - totalPaid;

      const isSettled = totalDue <= 0;

      /* ================= RESPONSE ================= */
      res.json({
        data: {
          rd_customer_id: id,

          plan_details: {
            plan_id: plan?._id || null,
            name: plan?.name || null,
            duration_months: durationMonths,
            installment_amount: installmentAmount,
            total_expected_amount: totalExpected
          },

          settlement_summary: {
            total_expected_amount: totalExpected,
            total_paid_amount: totalPaid,
            due_amount: totalDue,
            settlement_amount: totalPaid,
            paid_installments: paidInstallments.length,
            unpaid_installments: unpaidInstallments.length,
            settlement_status: isSettled ? 'SETTLED' : 'PENDING'
          }
        },
        error: null
      });
    } catch (err) {
      res.status(400).json({
        data: null,
        error: {
          code: 'RD_SETTLEMENT_SUMMARY_ERROR',
          message: err.message
        }
      });
    }
  }
);


// ------------------- RD INSTALLMENTS API -------------------

// List installments: supports rd_customer_id, current_month=true, overdue=true
app.get('/rd/installments', authMiddleware, async (req, res) => {
  try {
    const { rd_customer_id, current_month, overdue } = req.query;
    const query = {};
    if (rd_customer_id) query.rd_customer_id = rd_customer_id;

    const today = new Date();

    if (current_month === 'true') {
      const ym = today.toISOString().slice(0,7); // YYYY-MM
      query.payment_date = { $regex: `^${ym}` };
    }

    if (overdue === 'true') {
      const isoToday = today.toISOString().split('T')[0];
      query.is_paid = false;
      query.payment_date = { $lt: isoToday };
    }

    const items = await RdInstallment.find(query).sort({ payment_date: 1 });
    res.json({ data: { items, total: items.length }, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { code: 'RD_INSTALLMENT_LIST_ERROR', message: err.message } });
  }
});

// ------------------- RD INSTALLMENTS - CURRENT MONTH (BY PAYMENT DATE) -------------------
app.get(
  '/rd/installments/current-month',
  authMiddleware,
  async (req, res) => {
    try {
      const now = new Date();

      const startDate = startOfMonth(now).toISOString().split('T')[0];
      const endDate = endOfMonth(now).toISOString().split('T')[0];

      // Fetch installments of current month using payment_date
      const installments = await RdInstallment.find({
        payment_date: {
          $gte: startDate,
          $lte: endDate,
        },
      }).sort({ payment_date: 1 });

      // Separate paid & unpaid
      const paidInstallments = installments.filter(i => i.is_paid === true);
      const unpaidInstallments = installments.filter(i => i.is_paid === false);

      // Totals
      const paidAmount = paidInstallments.reduce(
        (sum, i) => sum + (i.amount || 0),
        0
      );

      const unpaidAmount = unpaidInstallments.reduce(
        (sum, i) => sum + (i.amount || 0),
        0
      );

      res.json({
        data: {
          month: format(now, 'yyyy-MM'),
          range: {
            start_date: startDate,
            end_date: endDate,
          },

          summary: {
            total_installments: installments.length,
            paid_count: paidInstallments.length,
            unpaid_count: unpaidInstallments.length,
            paid_amount: paidAmount,
            unpaid_amount: unpaidAmount,
          },

          paid_installments: paidInstallments,
          unpaid_installments: unpaidInstallments,
        },
        error: null,
      });
    } catch (error) {
      console.error('RD Installment Current Month Error:', error);
      res.status(500).json({
        data: null,
        error: {
          code: 'RD_INSTALLMENT_CURRENT_MONTH_ERROR',
          message: error.message,
        },
      });
    }
  }
);


// Mark installment as paid (manual) — this endpoint now handles ledger & agent commission
app.patch('/rd/installments/:id/mark_paid', authMiddleware, rbacMiddleware(['manager','super_admin','office_staff']), upload.array('files'), async (req, res) => {
  try {
    
    const files = req.files || [];
    const result = await markRdInstallmentPaid(req.params.id, req.body, files, req.user.user_id);

    res.json({ data: result, error: null });
  } catch (err) {
    console.error('MARK_PAID error:', err);
    res.status(400).json({ data: null, error: { code: 'RD_MARK_PAID_ERROR', message: err.message } });
  }
});

// ------------------- RD PAYMENTS (ledger) API -------------------

// List RD payments (records)
app.get('/rd/payments', authMiddleware, async (req, res) => {
  try {
    const { rd_customer_id } = req.query;
    const q = {};
    if (rd_customer_id) q.rd_customer_id = rd_customer_id;
    const items = await RdPayment.find(q).sort({ created_at: -1 });
    res.json({ data: { items, total: items.length }, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { code: 'RD_PAYMENTS_LIST_ERROR', message: err.message } });
  }
});

// ------------------- GET CURRENT MONTH RD PAYMENTS -------------------
app.get(
  '/rd/payments/current-month',
  authMiddleware,
  async (req, res) => {
    try {
      const now = new Date();
      const startDate = startOfMonth(now).toISOString().split('T')[0];
      const endDate = endOfMonth(now).toISOString().split('T')[0];

      const payments = await RdPayment.find({
        scheduled_payment_date: {
          $gte: startDate,
          $lte: endDate,
        },
      }).sort({ scheduled_payment_date: 1 });

      res.json({
        data: {
          month: format(now, 'yyyy-MM'),
          total_payments: payments.length,
          items: payments,
        },
        error: null,
      });
    } catch (error) {
      res.status(500).json({
        data: null,
        error: {
          code: 'RD_PAYMENT_FETCH_ERROR',
          message: error.message,
        },
      });
    }
  }
);


app.get(
  '/rd/payments/current-month/eligible',
  authMiddleware,
  async (req, res) => {
    try {
      const now = new Date();

      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);

      // fetch ALL RD payments up to current month (paid + unpaid)
      const rdPayments = await RdPayment.find({
        scheduled_payment_date: {
          $lte: currentMonthEnd.toISOString().split('T')[0],
        },
      });

      const resultPayments = [];

      for (const payment of rdPayments) {
        // fetch installments
        const installments = await RdInstallment.find({
          rd_customer_id: payment.rd_customer_id,
        });

        if (installments.length === 0) continue;

        const paidInstallments = installments.filter(i => i.is_paid);

        // skip if any installment unpaid
        if (paidInstallments.length !== installments.length) continue;

        // last installment paid date
        const lastPaidInstallment = paidInstallments.reduce((latest, curr) =>
          new Date(curr.paid_at) > new Date(latest.paid_at) ? curr : latest
        );

        const lastInstallmentPaidDate = new Date(lastPaidInstallment.paid_at);

        const rdPaymentMonthStart = startOfMonth(
          new Date(payment.scheduled_payment_date)
        );

        // effective payout month logic
        const effectivePaymentMonth =
          lastInstallmentPaidDate < rdPaymentMonthStart
            ? rdPaymentMonthStart
            : addMonths(rdPaymentMonthStart, 1);

        //  not yet eligible
        if (effectivePaymentMonth > currentMonthEnd) continue;

        //  decide status
        let status = 'CURRENT';

        if (payment.is_paid) {
          status = 'PAID';
        } else if (effectivePaymentMonth < currentMonthStart) {
          status = 'OVERDUE';
        }

        resultPayments.push({
          ...payment.toObject(),
          last_installment_paid_at: lastInstallmentPaidDate
            .toISOString()
            .split('T')[0],
          effective_payment_month: format(effectivePaymentMonth, 'yyyy-MM'),
          status,
        });
      }

      res.json({
        data: {
          month: format(now, 'yyyy-MM'),
          total_payments: resultPayments.length,
          items: resultPayments,
        },
        error: null,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        data: null,
        error: {
          code: 'RD_ELIGIBLE_PAYMENT_ERROR',
          message: error.message,
        },
      });
    }
  }
);



app.get(
  '/rd/payments/customer/:rdCustomerId',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin', 'office_staff']),
  async (req, res) => {
    try {
      const { rdCustomerId } = req.params;

      const payments = await RdPayment.find({
        rd_customer_id: rdCustomerId
      })
        .sort({ scheduled_payment_date: 1 })
        .lean();

      res.json({
        data: {
          items: payments,
          total: payments.length
        },
        error: null
      });
    } catch (err) {
      console.error('RD Payments by Customer fetch error:', err);
      res.status(500).json({
        data: null,
        error: {
          code: 'RD_PAYMENTS_BY_CUSTOMER_ERROR',
          message: err.message || 'Failed to fetch RD payments for customer'
        }
      });
    }
  }
);

// Get single RD payment
app.get('/rd/payments/:id', authMiddleware, async (req, res) => {
  try {
    const p = await RdPayment.findById(req.params.id);
    if (!p) return res.status(404).json({ data: null, error: { code: 'NOT_FOUND' }});
    res.json({ data: p, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { code: 'RD_PAYMENT_FETCH_ERROR', message: err.message } });
  }
});

// Optional: Mark RdPayment as paid/unpaid (admin)
// app.patch('/rd/payments/:id/mark_paid', authMiddleware, rbacMiddleware(['manager','super_admin']), upload.array('files'), async (req, res) => {
//   try {
//     const { is_paid, transaction_id, payment_date, payment_type, cheque_number } = req.body;
//     const files = req.files || [];
//     const images = files.length ? await uploadImages(files) : [];
//     const old = await RdPayment.findById(req.params.id);
//     if (!old) throw new Error('RdPayment not found');

//     const updated = await RdPayment.findByIdAndUpdate(req.params.id, {
//       is_paid: typeof is_paid !== 'undefined' ? is_paid : old.is_paid,
//       transaction_id: transaction_id || old.transaction_id,
//       payment_date: payment_date || old.payment_date,
//       payment_type: payment_type || old.payment_type,
//       cheque_number: cheque_number || old.cheque_number,
//       images: [...(old.images || []), ...images],
//       updated_at: new Date()
//     }, { new: true });

//     await auditLog('rd_payments', updated._id, 'MARK_PAID', old.toObject(), updated.toObject(), req.user.user_id);
//     res.json({ data: updated, error: null });
//   } catch (err) {
//     res.status(400).json({ data: null, error: { code: 'RD_PAYMENT_MARK_PAID_ERROR', message: err.message } });
//   }
// });

app.patch(
  '/rd/payments/:id/mark_paid',
  authMiddleware,
  rbacMiddleware(['manager','super_admin']),
  upload.array('files'),
  async (req, res) => {
    try {
      const { payment_method, transaction_id, cheque_number, payment_date } = req.body;
      const files = req.files || [];
      const images = files.length ? await uploadImages(files) : [];

      const payment = await RdPayment.findById(req.params.id);
      if (!payment) {
        return res.status(404).json({ error: 'Final payment not found' });
      }

      if (payment.is_paid) {
        return res.status(400).json({ error: 'Final payment already paid' });
      }

      payment.is_paid = true;
      payment.payment_method = payment_method || 'Online';
      payment.transaction_id = transaction_id || null;
      payment.cheque_number = cheque_number || null;
      payment.payment_date = payment_date || _iso(new Date());
      payment.images = [...(payment.images || []), ...images];
      payment.updated_at = new Date();
      await payment.save();

      await auditLog(
        'rd_payments',
        payment._id,
        'MARK_PAID_FINAL',
        null,
        payment.toObject(),
        req.user.user_id
      );

      
      res.json({ data: payment });

    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);




// ------------------- RD AGENT PAYMENTS API -------------------

// List RD agent payments
app.get('/rd/agent-payments', authMiddleware, async (req, res) => {
  try {
    const { agent_id } = req.query;
    const q = agent_id ? { agent_id } : {};
    const items = await RdAgentPayment.find(q).sort({ payment_date: 1 });
    res.json({ data: { items, total: items.length }, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { code: 'RD_AGENT_PAYMENT_LIST_ERROR', message: err.message } });
  }
});

// Mark RD agent payment as paid
app.patch('/rd/agent-payments/:id/mark_paid', authMiddleware, rbacMiddleware(['manager','super_admin']), upload.array('files'), async (req, res) => {
  try {
    const { transaction_id, method } = req.body;
    const files = req.files || [];
    const images = files.length ? await uploadImages(files) : [];
    const oldData = await RdAgentPayment.findById(req.params.id);
    if (!oldData) throw new Error('Agent payment not found');

    const updated = await RdAgentPayment.findByIdAndUpdate(req.params.id, {
      is_paid: true,
      paid_at: new Date(),
      transaction_id: transaction_id || oldData.transaction_id,
      method: method || oldData.method,
      images: [...(oldData.images || []), ...images],
      updated_at: new Date()
    }, { new: true });

    await auditLog('rd_agent_payments', updated._id, 'MARK_PAID', oldData.toObject(), updated.toObject(), req.user.user_id);
    res.json({ data: updated, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { code: 'RD_AGENT_PAYMENT_MARK_PAID_ERROR', message: err.message } });
  }
});

// ------------------- RD Settlement Summary API -------------------

// Provide settlement summary for RD customer (total installments expected / received / due)
app.get('/rd/customers/:id/settlement-summary', authMiddleware, rbacMiddleware(['manager','super_admin']), async (req, res) => {
  try {
    const id = req.params.id;
    const installments = await RdInstallment.find({ rd_customer_id: id }).lean();
    const totalExpected = installments.reduce((s, it) => s + (it.amount || 0), 0);
    const totalPaid = installments.filter(it => it.is_paid).reduce((s, it) => s + (it.amount || 0), 0);

    res.json({ data: { rd_customer_id: id, total_expected: totalExpected, total_received: totalPaid, due: totalExpected - totalPaid }, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { code: 'RD_SETTLEMENT_SUMMARY_ERROR', message: err.message } });
  }
});


app.get(
  '/rd/penalties',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      const {
        rd_customer_id,
        installment_id,
        penalty_month
      } = req.query;

      const filter = {};

      if (rd_customer_id) filter.rd_customer_id = rd_customer_id;
      if (installment_id) filter.installment_id = installment_id;
      if (penalty_month) filter.penalty_month = penalty_month;

      const penalties = await RdPenalty.find(filter)
        .sort({ created_at: -1 });

      res.json({
        data: penalties,
        error: null
      });
    } catch (err) {
      res.status(500).json({
        data: null,
        error: {
          code: 'RD_PENALTY_FETCH_ERROR',
          message: err.message
        }
      });
    }
  }
);


app.get(
  '/rd/penalties/:rdCustomerId',
  authMiddleware,
  rbacMiddleware(['manager', 'super_admin']),
  async (req, res) => {
    try {
      const penalties = await RdPenalty.find({
        rd_customer_id: req.params.rdCustomerId
      }).sort({ created_at: -1 });

      res.json({ data: penalties, error: null });
    } catch (err) {
      res.status(500).json({
        data: null,
        error: {
          code: 'RD_PENALTY_FETCH_ERROR',
          message: err.message
        }
      });
    }
  }
);





// ------------------- ERROR HANDLER -------------------
app.use((error, req, res, next) => {
  console.error(error);
  res
    .status(500)
    .json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } });
});


app.get("/", (req, res) => {
  res.send("server is running");

  
});


// ------------------- START SERVER -------------------
async function startServer() {
  await connectDB();
  await setupDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();