import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { seedSalaryRevisions } from "./seed-salary-revisions";
import {
  DEFAULT_KPI_ANNUAL_TARGET,
  DEFAULT_KPI_MONTHLY_TARGET,
  DEFAULT_KPI_RATING_SCALE,
  KPI_ANNUAL_TARGET_SETTING,
  KPI_MONTHLY_TARGET_SETTING,
  KPI_RATING_SCALE_SETTING,
  KPI_SEED_DEPARTMENTS,
  type KpiSeedItem,
} from "../src/lib/kpi";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

type Role = "ADMIN" | "MANAGEMENT" | "MANAGER" | "HR" | "TL" | "EMPLOYEE" | "PARTNER";

type EmpRow = {
  empNo: number;
  firstName: string;
  lastName: string;
  location: string;
  fatherName?: string;
  email?: string;
  personalEmail?: string;
  department: string;
  designation: string;
  zohoRole?: string;
  employmentType?: string;
  employeeStatus?: string;
  sourceOfHire?: string;
  joiningDate: string;
  reportingManagerEmpNo?: number;
  dob?: string;
  gender?: string;
  maritalStatus?: string;
  workPhone?: string;
  personalPhone?: string;
  presentAddress?: string;
  permanentAddress?: string;
  aadhaar?: string;
  pan?: string;
  uan?: string;
  bankName?: string;
  bankAccount?: string;
  ifsc?: string;
  accountType?: string;
  stateCode?: string;
  secondaryRole?: Role;
};

const EMPLOYEES: EmpRow[] = [
  // Directors / Partners
  { empNo: 101, firstName: "VIJAYAKUMAR", lastName: "DAMODARAN", location: "Chennai", fatherName: "DAMODARAN B", email: "vijaykumar@adarshshipping.in", department: "Director", designation: "Management", zohoRole: "Director", employmentType: "Management", employeeStatus: "Active", joiningDate: "1989-07-15", gender: "Male", maritalStatus: "Married", personalPhone: "9840036508", presentAddress: "113/6, HALLS ROAD, KILPAUK, CHENNAI", aadhaar: "319722987524", pan: "AABPV2018A", bankName: "State Bank of India", bankAccount: "10030656382", ifsc: "SBIN0007107", accountType: "Savings", stateCode: "TN" },
  { empNo: 122, firstName: "DEVENDRAN", lastName: "DAMODARAN", location: "Chennai", fatherName: "DAMODARAN", email: "dev@adarshshipping.in", personalEmail: "rtndev68@gmail.com", department: "Director", designation: "Management", zohoRole: "Director", employmentType: "Management", employeeStatus: "Active", sourceOfHire: "Direct", joiningDate: "1989-09-15", reportingManagerEmpNo: 101, gender: "Male", maritalStatus: "Married", workPhone: "9840044701", personalPhone: "9840044701", presentAddress: "No.27/13, DR.RADHAKRISHNAN NAGAR MAIN ROAD, THIRUVANMIYUR, Chennai", aadhaar: "333147508850", pan: "AACPD1200H", bankName: "State Bank of India", bankAccount: "10030658970", ifsc: "SBIN0007107", accountType: "Savings", stateCode: "TN" },
  // HR + TL (Purushothaman — logs in as purushothaman.v@adarshshipping.in, lands on /reviewer)
  { empNo: 116, firstName: "PURUSHOTHAMAN", lastName: "V", location: "Chennai", fatherName: "VENKATESAN V", email: "purushothaman.v@adarshshipping.in", department: "Head of HR", designation: "Manager", zohoRole: "HR", employmentType: "Permanent", employeeStatus: "Active", sourceOfHire: "Direct", joiningDate: "2022-11-15", reportingManagerEmpNo: 101, gender: "Male", maritalStatus: "Single", workPhone: "7305005113", personalPhone: "7338960589", presentAddress: "12/9 periyar salai, kovilambakkam, CHENNAI", aadhaar: "312383453011", pan: "BXCPV5314G", bankName: "ICICI Bank", bankAccount: "768501500270", ifsc: "ICIC0007685", accountType: "Savings", stateCode: "TN", secondaryRole: "TL" },
  // Management
  { empNo: 189, firstName: "Adarsh", lastName: "VR", location: "Chennai", email: "adarsh@adarshshipping.in", department: "Executive Team", designation: "Consultant", zohoRole: "Management", employmentType: "On Contract", employeeStatus: "Active", joiningDate: "2025-11-01" },
  { empNo: 146, firstName: "AISHWARIYA", lastName: "VIJAYAKUMAR", location: "Chennai", fatherName: "Vijayakumar", email: "aishwariya.v@adarshshipping.in", personalEmail: "aishwariyasweetlin7@gmail.com", department: "Executive Team", designation: "Management", zohoRole: "Management", employmentType: "Permanent", employeeStatus: "Active", joiningDate: "2022-06-15", reportingManagerEmpNo: 101, gender: "Female", maritalStatus: "Married", workPhone: "9444391406", personalPhone: "9444391406", presentAddress: "13/6 Halls Road, kilpauk, chennai", aadhaar: "409914375222", pan: "ASZPA6922E", bankName: "IDFC", bankAccount: "10141827300", ifsc: "IDFB0080121", accountType: "Savings" },
  { empNo: 132, firstName: "Akshaya", lastName: "Blessey", location: "Chennai", fatherName: "Vijayakumar", email: "akshaya.blessey@adarshshipping.in", department: "Executive Team", designation: "Executive", zohoRole: "Management", employmentType: "Permanent", employeeStatus: "Active", joiningDate: "2023-06-15", reportingManagerEmpNo: 101, gender: "Female", maritalStatus: "Single", personalPhone: "9025593143", pan: "EJQPA3977M", bankName: "State Bank of India", bankAccount: "40726211432", ifsc: "SBIN0040297", accountType: "Savings", stateCode: "TN" },
  { empNo: 130, firstName: "AMIRTHA", lastName: "VARSHINI", location: "Chennai", fatherName: "DEVENDRAN", email: "amirthavarshini@adarshshipping.in", personalEmail: "amirthavarshini4@gmail.com", department: "Executive Team", designation: "Trainee", zohoRole: "Team member", employeeStatus: "Active", joiningDate: "2022-12-15", reportingManagerEmpNo: 101, gender: "Female", maritalStatus: "Single", workPhone: "9840642515", personalPhone: "9840642515", presentAddress: "No.27/13, DR.RADHAKRISHNAN NAGAR MAIN ROAD, THIRUVANMIYUR, Chennai", aadhaar: "758307179373", bankName: "State Bank of India", accountType: "Savings", stateCode: "TN" },
  // Managers
  { empNo: 187, firstName: "Dineshan", lastName: "Pm", location: "Chennai", fatherName: "Mohan V", email: "dineshan.accounts@adarshshipping.in", personalEmail: "pmdineshan@gmail.com", department: "Head of Accounts", designation: "Consultant", zohoRole: "Manager", employmentType: "On Contract", employeeStatus: "Active", sourceOfHire: "Direct", joiningDate: "2025-10-15", reportingManagerEmpNo: 101, gender: "Male", maritalStatus: "Single", workPhone: "6374958475", presentAddress: "no 44c puzuthivakkam main road, puzuthivakkam, Chennai", pan: "HLHPD5343A", bankName: "HDFC", bankAccount: "50100467834101", ifsc: "HDFC0000675", accountType: "Savings", stateCode: "TN", secondaryRole: "TL" },
  { empNo: 129, firstName: "KIRUBAKARI", lastName: "S", location: "Chennai", fatherName: "A. DOSS", email: "kiruba.s@adarshshipping.in", personalEmail: "kiruba.documentation@adarshshipping.org", department: "Head of Custom Broker's", designation: "Manager", zohoRole: "Manager", employmentType: "Permanent", employeeStatus: "Active", joiningDate: "1996-01-15", reportingManagerEmpNo: 101, gender: "Female", maritalStatus: "Married", workPhone: "9444391407", personalPhone: "9444391407", presentAddress: "No 9, muthu naicken street, perumalpet, purasaiwalkam, Chennai", aadhaar: "987583974096", pan: "EORPK7505H", bankName: "ICICI Bank", bankAccount: "768501500276", ifsc: "ICIC0007685", accountType: "Savings", stateCode: "TN" },
  { empNo: 121, firstName: "ABHILASH", lastName: "D", location: "Chennai", fatherName: "DEVENDRAN", email: "abhilash@adarshshipping.in", personalEmail: "abhidev7381@gmail.com", department: "Head of Freight Forwarding", designation: "Manager", zohoRole: "Manager", employmentType: "Permanent", employeeStatus: "Active", joiningDate: "2020-11-15", reportingManagerEmpNo: 101, gender: "Male", maritalStatus: "Married", workPhone: "9841136551", personalPhone: "9841136551", presentAddress: "No.27/13, DR.RADHAKRISHNAN NAGAR MAIN ROAD, THIRUVANMIYUR, Chennai", aadhaar: "784575634916", pan: "CLXPA2730D", bankName: "State Bank of India", bankAccount: "35362851734", ifsc: "SBIN0001985", accountType: "Savings", stateCode: "TN" },
  // Team Leaders
  { empNo: 172, firstName: "Naveen", lastName: "Sathiyan", location: "Chennai", fatherName: "Sathiyan.P.K", email: "naveen@adarshshipping.in", personalEmail: "naveens777@gmail.com", department: "Freight Forwarding Business Development", designation: "Assistant Manager", zohoRole: "Team Leader", employmentType: "Permanent", employeeStatus: "Active", sourceOfHire: "Web", joiningDate: "2024-10-15", reportingManagerEmpNo: 121, gender: "Male", maritalStatus: "Single", presentAddress: "39/40, Avadi Srinivasan Street, Choolai, Chennai", aadhaar: "237783234868", pan: "AVWPN0944R", uan: "101789003216", bankName: "HDFC", bankAccount: "12841140023145", ifsc: "HDFC0001284", accountType: "Savings", stateCode: "TN" },
  { empNo: 108, firstName: "SATHIYA MOORTHY", lastName: "DHANASEKARAN", location: "Chennai", fatherName: "DHANASEKARAN .N", email: "sathiyam4545@gmail.com", department: "Custom Broker Operations", designation: "Team Leader", zohoRole: "Team Leader", employmentType: "Permanent", employeeStatus: "Active", joiningDate: "2014-01-15", reportingManagerEmpNo: 129, gender: "Male", maritalStatus: "Married", personalPhone: "9003074475", presentAddress: "9/2, SHAMUGA SUNDARAM NAGAR, 1 ST STREET MADHAVRAM, CHENNAI", aadhaar: "749325162732", pan: "CEAPS7076G", bankName: "ICICI Bank", bankAccount: "768501500635", ifsc: "ICIC0007685", accountType: "Savings", stateCode: "TN" },
  { empNo: 107, firstName: "SAMSON", lastName: "PRAKASAM", location: "Chennai", fatherName: "PRAKASAM", email: "samson.p@adarshshipping.in", personalEmail: "samsonprakasam@gmail.com", department: "Customs Broker Delivery Order", designation: "Consultant", zohoRole: "Team Leader", employmentType: "Permanent", employeeStatus: "Active", joiningDate: "2010-01-15", reportingManagerEmpNo: 129, gender: "Male", maritalStatus: "Married", personalPhone: "9940505186", presentAddress: "NO. 4 / 65, MOHAMMED HUSSAIN STREET, ROYAPETTAH, CHENNAI", aadhaar: "336270093497", pan: "BUEPS7217Q", bankName: "ICICI Bank", bankAccount: "768501500274", ifsc: "ICIC0007685", accountType: "Savings", stateCode: "TN" },
  // HR staff
  { empNo: 160, firstName: "Babyshalini", lastName: "K", location: "Chennai", fatherName: "K.Kathiresan", email: "shalini.k@adarshshipping.in", personalEmail: "babyshalini424@gmail.com", department: "Human Resource Operation", designation: "Associate", zohoRole: "HR", employmentType: "Permanent", employeeStatus: "Active", sourceOfHire: "Referral", joiningDate: "2024-07-15", reportingManagerEmpNo: 116, gender: "Female", maritalStatus: "Single", workPhone: "8925825652", pan: "EVLPB8991K", bankName: "Tamilnadu Mercantile Bank", bankAccount: "105100080200282", ifsc: "TMBL0000105", accountType: "Savings", secondaryRole: "TL" },
  // Employees
  { empNo: 188, firstName: "Mohammed", lastName: "Saiffudin", location: "Chennai", fatherName: "ABDUL SATTAR", email: "mohammedsaiffudin@adarshshipping.in", personalEmail: "mohammedsaifuddin015@gmail.com", department: "Freight Forwarding Customer Support", designation: "Trainee", zohoRole: "Team member", employmentType: "Trainee", employeeStatus: "Active", sourceOfHire: "Web", joiningDate: "2025-11-15", reportingManagerEmpNo: 172, gender: "Male", maritalStatus: "Single", personalPhone: "9176788435", presentAddress: "No.85, Sathya sai nagar 5th street", aadhaar: "278562585381", pan: "FACPA0808K", bankName: "Kotak Mahindra Bank", bankAccount: "2448666572", ifsc: "KKBK0008525", accountType: "Savings", stateCode: "TN" },
  { empNo: 186, firstName: "Sriram", lastName: "S", location: "Chennai", fatherName: "Srinivasan", email: "sriram@adarshshipping.in", personalEmail: "sriramsrinivasan1654@gmail.com", department: "Freight Forwarding Sales", designation: "Trainee", zohoRole: "Team member", employmentType: "Trainee", employeeStatus: "Active", sourceOfHire: "Referral", joiningDate: "2025-10-01", reportingManagerEmpNo: 172, gender: "Male", maritalStatus: "Single", workPhone: "7305005114", personalPhone: "9840283091", presentAddress: "No : 2 adhiseshan nagar, perambur high road, mangalapuram, chennai", aadhaar: "419889790132", pan: "QYJPS5626H", bankName: "Indian Overseas Bank", bankAccount: "171201000028815", ifsc: "IOBA0001712", accountType: "Savings", stateCode: "TN" },
  { empNo: 184, firstName: "Keerthana", lastName: "P", location: "Chennai", fatherName: "Prabakaran", email: "keerthana@adarshshipping.in", personalEmail: "keerthi2002prabhu@gmail.com", department: "Accounts Payable", designation: "Executive", zohoRole: "Team member", employmentType: "Trainee", employeeStatus: "Active", sourceOfHire: "Web", joiningDate: "2025-08-15", reportingManagerEmpNo: 187, gender: "Female", maritalStatus: "Single", personalPhone: "9360527887", presentAddress: "No 1. G Block, A.M garden, Mandaveli, chennai", aadhaar: "727518340819", pan: "PCWPK5650R", bankName: "State Bank of India", bankAccount: "40139142292", ifsc: "SBIN0001854", accountType: "Savings", stateCode: "TN" },
  { empNo: 183, firstName: "Sridhar", lastName: "B", location: "Chennai", fatherName: "babu", email: "bsridhar18@gmail.com", personalEmail: "bsridhar18@gmail.com", department: "Custom Broker Operations", designation: "Consultant", zohoRole: "Team member", employmentType: "On Contract", employeeStatus: "Active", sourceOfHire: "Direct", joiningDate: "2025-08-15", reportingManagerEmpNo: 101, gender: "Male", maritalStatus: "Married", personalPhone: "9940060047", presentAddress: "no.79, choolai high road, choolai, Chennai", pan: "CHCPS9710G", bankName: "Canara Bank", bankAccount: "0943101038871", ifsc: "CNRB0000943", accountType: "Savings", stateCode: "TN" },
  { empNo: 181, firstName: "Sandhya", lastName: "K", location: "Chennai", fatherName: "S.SHANKAR", email: "sandhya.k@adarshshipping.in", personalEmail: "sandy.s.k1993@gmail.com", department: "Custom Broker Documentation", designation: "Executive", zohoRole: "Team member", employmentType: "Trainee", employeeStatus: "Active", sourceOfHire: "Web", joiningDate: "2025-06-15", reportingManagerEmpNo: 129, gender: "Female", maritalStatus: "Married", personalPhone: "9894285113", presentAddress: "NO-2/16 VEERASAMY 3RD STREET, AYANAVARAM, CHENNAI", aadhaar: "912578745220", pan: "EQLPS2266B", uan: "100867122046", bankName: "Bank of Baroda", bankAccount: "05290100022300", ifsc: "BARB0NORTHB", accountType: "Savings", stateCode: "TN" },
  { empNo: 180, firstName: "Bhuvaneshwari", lastName: "S", location: "Chennai", fatherName: "V.Shanmugam", email: "bhuvaneshwari@adarshshipping.in", personalEmail: "bhubhuvi529@gmail.com", department: "Freight Forwarding Sales", designation: "Executive", zohoRole: "Team member", employmentType: "Trainee", employeeStatus: "Active", sourceOfHire: "Web", joiningDate: "2025-05-15", reportingManagerEmpNo: 172, gender: "Female", maritalStatus: "Single", workPhone: "7305005117", personalPhone: "7904558784", presentAddress: "House no : 8/55 Periya thambi street, Choolai, Chennai", aadhaar: "299422830257", pan: "GXJPB2984J", bankName: "Central Bank of India", bankAccount: "3495487995", ifsc: "CBIN0280882", accountType: "Savings", stateCode: "TN" },
  { empNo: 178, firstName: "Balaji", lastName: "K", location: "Chennai", fatherName: "M.KUMAR", email: "balaji.k@adarshshipping.in", personalEmail: "balajiups1985@gmail.com", department: "CFS Operations", designation: "Associate", zohoRole: "Team member", employmentType: "Permanent", employeeStatus: "Active", sourceOfHire: "Referral", joiningDate: "2025-03-15", reportingManagerEmpNo: 108, gender: "Male", maritalStatus: "Married", personalPhone: "9840047894", presentAddress: "158/a perumal koil street madhavaram, chennai", pan: "EIXPB3983A", bankName: "HDFC Bank", bankAccount: "50100101878720", ifsc: "HDFC0001880", accountType: "Savings", stateCode: "TN" },
  { empNo: 175, firstName: "Maansi", lastName: "B", location: "Chennai", fatherName: "K BABU", email: "maansimadison@gmail.com", department: "Delivery Order Documentation", designation: "Associate", zohoRole: "Team member", employmentType: "Permanent", employeeStatus: "Active", sourceOfHire: "Referral", joiningDate: "2024-12-15", reportingManagerEmpNo: 107, gender: "Female", pan: "HMPPM1675D", bankName: "State Bank of India", bankAccount: "41070087111", ifsc: "SBIN0015491", accountType: "Savings" },
  { empNo: 173, firstName: "Ranga", lastName: "Nayaki", location: "Chennai", fatherName: "P.Shankar", email: "ranganayaki.accounts@adarshshipping.in", personalEmail: "nayakiranga03@gmail.com", department: "Accounts Receivable", designation: "Associate", zohoRole: "Team member", employmentType: "Permanent", employeeStatus: "Active", sourceOfHire: "Web", joiningDate: "2024-11-15", reportingManagerEmpNo: 187, gender: "Female", maritalStatus: "Single", presentAddress: "NO.115/17 VENKATAPURAM STREET, LITTLE MOUNT, SAIDAPET, CHENNAI", pan: "FDCPR1160L", bankName: "ICICI Bank", bankAccount: "602501525645", ifsc: "ICIC0006025", accountType: "Savings", stateCode: "TN" },
  { empNo: 171, firstName: "BALA HARIHARAN", lastName: "K", location: "Chennai", fatherName: "KATHIRAVAN C", email: "balahariharan@adarshshipping.in", personalEmail: "itszoro3792@gmail.com", department: "CFS Operations", designation: "Associate", zohoRole: "Team member", employmentType: "Permanent", employeeStatus: "Active", sourceOfHire: "Direct", joiningDate: "2024-10-01", reportingManagerEmpNo: 108, gender: "Male", maritalStatus: "Single", personalPhone: "7339135902", presentAddress: "M 26 B RMCOLONY, 6TH CROSS, DINDIGUL", aadhaar: "223059622308", pan: "EOKPB6799M", bankName: "ICICI Bank", bankAccount: "768501500626", ifsc: "ICIC0007685", accountType: "Savings", stateCode: "TN" },
  { empNo: 156, firstName: "MADHAVAN", lastName: "M", location: "Chennai", fatherName: "MADHAN", email: "madhavan.m@adarshshipping.in", personalEmail: "maddymadhav1846@gmail.com", department: "Delivery Order Operations", designation: "Associate", zohoRole: "Team member", employmentType: "Permanent", employeeStatus: "Active", sourceOfHire: "Web", joiningDate: "2023-01-15", reportingManagerEmpNo: 116, gender: "Male", maritalStatus: "Married", personalPhone: "9384319733", presentAddress: "NO,75,RAMDOSS NAGAR,OLD WASHERMENPET CHENNAI", aadhaar: "293640913065", pan: "IVNPM5096N", bankName: "Bank of Baroda", bankAccount: "05300100021731", ifsc: "BARB0SOWCAR", accountType: "Savings", stateCode: "TN" },
  { empNo: 150, firstName: "Nandha Gopal", lastName: "J", location: "Chennai", fatherName: "JAYARAMAN", email: "nandhagopal.j@adarshshipping.in", personalEmail: "nandhagopal6789@gmail.com", department: "Transportation", designation: "Executive", zohoRole: "Team member", employmentType: "On Contract", employeeStatus: "Active", joiningDate: "2023-04-15", reportingManagerEmpNo: 129, gender: "Male", maritalStatus: "Married", workPhone: "8825826749", personalPhone: "8825826749", presentAddress: "360/127 C, VIJAYALAKSHMI NILAYAM, BANAVARAM, SHOLINGHUR TK", aadhaar: "653662782228", pan: "BCLPN4740G", bankName: "Indian Bank", bankAccount: "616827238", ifsc: "IDIB000H003", accountType: "Savings", stateCode: "TN" },
  { empNo: 142, firstName: "POORNIMA", lastName: "V", location: "Chennai", fatherName: "Venkatesan N", email: "poornima.v@adarshshipping.in", personalEmail: "poornivenki1909@gmail.com", department: "Freight Forwarding Customer Support", designation: "Executive", zohoRole: "Team member", employmentType: "Permanent", employeeStatus: "Active", sourceOfHire: "Web", joiningDate: "2023-06-15", reportingManagerEmpNo: 172, gender: "Female", maritalStatus: "Single", personalPhone: "9941856617", presentAddress: "4/93, Mettu street, Ayanavaram, chennai", aadhaar: "629425919161", pan: "GBRPP2003N", bankName: "ICICI Bank", bankAccount: "768501500263", ifsc: "ICIC0007685", accountType: "Savings", stateCode: "TN" },
  { empNo: 138, firstName: "DINESH SATYANARAYAN", lastName: "GIRI", location: "Mundra", fatherName: "SATYANARAYAN GIRI", email: "dineshsatyanarayangiri@gmail.com", department: "CFS Operations", designation: "Associate", zohoRole: "Team member", employmentType: "Permanent", employeeStatus: "Active", sourceOfHire: "Direct", joiningDate: "2019-05-15", reportingManagerEmpNo: 125, gender: "Male", maritalStatus: "Single", personalPhone: "9967545402", presentAddress: "A-34, LIG - 2, KALAMBOLI SECTOR - 1, KALAMBOLI NODE, Maharashtra", aadhaar: "515203415263", pan: "AOIPG8757L", bankName: "Union Bank of India", bankAccount: "482002010005250", ifsc: "UBIN0548201", accountType: "Savings", stateCode: "MH" },
  { empNo: 128, firstName: "ARUNKUMAR", lastName: "B", location: "Chennai", fatherName: "K.BALU", email: "arun.kumar@adarshshipping.in", personalEmail: "arunark111@gmail.com", department: "CFS Operations", designation: "Associate", zohoRole: "Team member", employmentType: "Permanent", employeeStatus: "Active", sourceOfHire: "Direct", joiningDate: "2022-03-15", reportingManagerEmpNo: 108, gender: "Male", personalPhone: "9080620600", presentAddress: "37/3, Kappal Polu Street, Chennai", aadhaar: "489343428191", pan: "CWRPA6208D", bankName: "ICICI Bank", bankAccount: "768501500633", ifsc: "ICIC0007685", accountType: "Savings", stateCode: "TN" },
  { empNo: 127, firstName: "SHYAM NARAYAN", lastName: "YADAV", location: "Mumbai", fatherName: "BAIJU YADAV", email: "shyamnarayanyadav802@gmail.com", department: "CFS Operations", designation: "Associate", zohoRole: "Team member", employmentType: "Permanent", employeeStatus: "Active", joiningDate: "2009-05-15", reportingManagerEmpNo: 125, gender: "Male", maritalStatus: "Married", personalPhone: "9867182691", presentAddress: "SHARAD MHATRE CHAWL, GB ROAD, DONGRIPADA, THANE WEST", aadhaar: "602850438216", pan: "AJFPY0390R", bankName: "Union Bank of India", bankAccount: "564302010012258", ifsc: "UBIN0556432", accountType: "Savings", stateCode: "MH" },
  { empNo: 125, firstName: "RAVI", lastName: "R", location: "Mumbai", fatherName: "P.RANGANATHAN", email: "ravi.mumbai@adarshshipping.in", personalEmail: "raviranganathan1971@gmail.com", department: "Head of Custom Broker's", designation: "Executive", zohoRole: "Team member", employmentType: "Permanent", employeeStatus: "Active", sourceOfHire: "Direct", joiningDate: "2006-06-15", reportingManagerEmpNo: 101, gender: "Male", maritalStatus: "Married", personalPhone: "9967006531", presentAddress: "FLAT NO 3/3 RESIDENCY PLOT NO 57, SECTOR 19, CBD BELAPUR, NAVI MUMBAI", aadhaar: "426755647681", pan: "BLOPR8556E", bankName: "Axis Bank", bankAccount: "911010035331175", ifsc: "UTIB0000861", accountType: "Savings", stateCode: "GJ" },
  { empNo: 120, firstName: "KARAN", lastName: "M", location: "Chennai", fatherName: "MURUGAN", email: "karan.m@adarshshipping.in", personalEmail: "bosskaran97@gmail.com", department: "Freight Forwarding Sales", designation: "Executive", zohoRole: "Team member", employmentType: "Permanent", employeeStatus: "Active", joiningDate: "2022-12-15", reportingManagerEmpNo: 121, gender: "Male", maritalStatus: "Single", personalPhone: "9566155421", presentAddress: "No 53/46 Arunachalam 1 st street, shenoy nagar, Chennai", aadhaar: "340005495216", pan: "FJXPK0973B", bankName: "ICICI Bank", bankAccount: "768501500628", ifsc: "ICIC0007685", accountType: "Savings", stateCode: "TN" },
  { empNo: 118, firstName: "SURYA", lastName: "K", location: "Chennai", fatherName: "KUMAR.P", email: "surya.k@adarshshipping.in", personalEmail: "masssuryapraveen@gmail.com", department: "CFS Operations", designation: "Associate", zohoRole: "Team member", employmentType: "Permanent", employeeStatus: "Active", joiningDate: "2022-10-15", reportingManagerEmpNo: 108, gender: "Male", maritalStatus: "Single", workPhone: "8939303569", personalPhone: "8939303569", presentAddress: "NO.13 RAJI GHANDHI NAGAR, ERUKKANCHERY, CHENNAI", aadhaar: "230149013868", pan: "NLIPS9618Q", bankName: "ICICI Bank", bankAccount: "768501500638", ifsc: "ICIC0007685", accountType: "Savings", stateCode: "TN" },
  { empNo: 113, firstName: "RAJESH KUMAR", lastName: "YADAV", location: "Delhi", fatherName: "LALJI YADAV", email: "rajeshyadav5572@gmail.com", department: "CFS Operations", designation: "Associate", zohoRole: "Team member", employmentType: "Permanent", employeeStatus: "Active", joiningDate: "2022-01-15", reportingManagerEmpNo: 103, gender: "Male", maritalStatus: "Married", personalPhone: "8076279508", presentAddress: "E-1/120 GROUND FLOOR, ISMAILPUR ROD JAITPUR EXT., PART 1, BADARPUR, SOUTH DELHI", aadhaar: "308224092971", pan: "ACHPY9317K", bankName: "Punjab National Bank", bankAccount: "4209000100038869", ifsc: "PUNB0420900", accountType: "Savings", stateCode: "DL" },
  { empNo: 112, firstName: "DINESH KUMAR", lastName: "YADAV", location: "Delhi", fatherName: "SAHAB LAL YADAV", email: "dineshkumar.delhi@adarshshipping.in", personalEmail: "dinesh.yadav1st@gmail.com", department: "Custom Broker Operations", designation: "Executive", zohoRole: "Team member", employmentType: "Permanent", employeeStatus: "Active", joiningDate: "2022-01-15", reportingManagerEmpNo: 103, gender: "Male", maritalStatus: "Married", personalPhone: "8802484217", presentAddress: "HOUSE NO. 956, GALI NO. 3, SHIV COLONY, FARIDABAD", aadhaar: "689066903516", pan: "ASJPY1767F", bankName: "IDBI Bank", bankAccount: "1127104000067661", ifsc: "IBKL0001127", accountType: "Savings", stateCode: "DL" },
  { empNo: 106, firstName: "PATIT PABAN", lastName: "GOSWAMI", location: "Kolkata", fatherName: "PRADIP KUMAR GOSWAMI", email: "goswami.kolkata@adarshshipping.in", personalEmail: "patitpaban.goswami@gmail.com", department: "Head of Custom Broker's", designation: "Executive", zohoRole: "Team member", employmentType: "Permanent", employeeStatus: "Active", joiningDate: "2005-05-15", reportingManagerEmpNo: 101, gender: "Male", maritalStatus: "Married", personalPhone: "9830552726", presentAddress: "6A, NIMU GOSWAMI LANE, KOLKATA", aadhaar: "402534302144", pan: "BJWPG8711Q", bankName: "Bank of Baroda", bankAccount: "00240100009541", ifsc: "BARB0UPPERC", accountType: "Savings", stateCode: "WB" },
  { empNo: 105, firstName: "SUJATHA", lastName: "SURESH", location: "Kolkata", fatherName: "S. SUNDARARAJAN", email: "sujatha.kolkata@adarshshipping.in", personalEmail: "sujathasuresh0705@gmail.com", department: "Custom Broker Operations", designation: "Associate", zohoRole: "Team member", employmentType: "Permanent", employeeStatus: "Active", joiningDate: "2004-09-15", reportingManagerEmpNo: 106, gender: "Female", maritalStatus: "Married", personalPhone: "9748748979", presentAddress: "P - 29, (9) RUBY PARK SOUTH, BINA NIKETAN, GROUND FLOOR, KOLKATA", aadhaar: "669202651065", pan: "CJJPS8491R", bankName: "State Bank of India", bankAccount: "52196275362", ifsc: "SBIN0020806", accountType: "Savings", stateCode: "WB" },
  { empNo: 103, firstName: "SELVAM", lastName: "RANGANATHAN", location: "Delhi", fatherName: "RANGANATHAN", email: "selvam.delhi@adarshshipping.in", department: "Head of Custom Broker's", designation: "Executive", zohoRole: "Team member", employmentType: "Permanent", employeeStatus: "Active", joiningDate: "2001-02-15", reportingManagerEmpNo: 101, gender: "Male", maritalStatus: "Married", personalPhone: "9873909777", presentAddress: "House No.-38, Ground Floor Right Side, Block- F, Vishwkarma Colony, M. B. Road, Delhi", aadhaar: "797929634657", pan: "CQUPS7181J", bankName: "Axis Bank", bankAccount: "911010000489995", ifsc: "UTIB0001103", accountType: "Savings", stateCode: "DL" },
];

type SalaryRow = {
  empNo: number;
  gross: number;
  ctc: number;
  basic: number;
  hra: number;
  conveyance: number;
  transport: number;
  travelling: number;
  fixed: number;
  stipend: number;
};

const SALARIES: SalaryRow[] = [
  { empNo: 116, gross: 528396, ctc: 528400, basic: 20000, hra: 10000, conveyance: 3000, transport: 0, travelling: 4500, fixed: 6533, stipend: 0 },
  { empNo: 103, gross: 420000, ctc: 420000, basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixed: 20000, stipend: 0 },
  { empNo: 105, gross: 144000, ctc: 144000, basic: 12000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixed: 0, stipend: 0 },
  { empNo: 106, gross: 192000, ctc: 192000, basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixed: 1000, stipend: 0 },
  { empNo: 112, gross: 276000, ctc: 276000, basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixed: 8000, stipend: 0 },
  { empNo: 118, gross: 264000, ctc: 264000, basic: 15000, hra: 5000, conveyance: 0, transport: 0, travelling: 0, fixed: 2000, stipend: 0 },
  { empNo: 120, gross: 408000, ctc: 408000, basic: 17000, hra: 8500, conveyance: 0, transport: 0, travelling: 2000, fixed: 6500, stipend: 0 },
  { empNo: 129, gross: 360000, ctc: 360000, basic: 15000, hra: 7500, conveyance: 0, transport: 0, travelling: 2500, fixed: 5000, stipend: 0 },
  { empNo: 108, gross: 414000, ctc: 414000, basic: 15000, hra: 7500, conveyance: 0, transport: 0, travelling: 5000, fixed: 7000, stipend: 0 },
  { empNo: 113, gross: 216000, ctc: 216000, basic: 14999, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixed: 3001, stipend: 0 },
  { empNo: 121, gross: 600000, ctc: 600000, basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixed: 35000, stipend: 0 },
  { empNo: 107, gross: 360000, ctc: 360000, basic: 15000, hra: 7500, conveyance: 0, transport: 0, travelling: 2500, fixed: 5000, stipend: 0 },
  { empNo: 128, gross: 288000, ctc: 288000, basic: 15000, hra: 7500, conveyance: 0, transport: 0, travelling: 1500, fixed: 0, stipend: 0 },
  { empNo: 125, gross: 432000, ctc: 432000, basic: 15000, hra: 10000, conveyance: 0, transport: 0, travelling: 6000, fixed: 5000, stipend: 0 },
  { empNo: 127, gross: 201000, ctc: 201000, basic: 12750, hra: 3000, conveyance: 0, transport: 0, travelling: 1000, fixed: 0, stipend: 0 },
  { empNo: 138, gross: 129900, ctc: 129900, basic: 6000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixed: 4825, stipend: 0 },
  { empNo: 132, gross: 180000, ctc: 180000, basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixed: 0, stipend: 0 },
  { empNo: 142, gross: 324000, ctc: 324000, basic: 15000, hra: 7500, conveyance: 0, transport: 0, travelling: 3000, fixed: 1500, stipend: 0 },
  { empNo: 146, gross: 216000, ctc: 216000, basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixed: 3000, stipend: 0 },
  { empNo: 156, gross: 162000, ctc: 162000, basic: 12000, hra: 0, conveyance: 0, transport: 0, travelling: 1500, fixed: 0, stipend: 0 },
  { empNo: 150, gross: 272400, ctc: 272400, basic: 15000, hra: 6000, conveyance: 0, transport: 0, travelling: 1000, fixed: 700, stipend: 0 },
  { empNo: 160, gross: 244800, ctc: 244800, basic: 15000, hra: 5000, conveyance: 0, transport: 0, travelling: 0, fixed: 400, stipend: 0 },
  { empNo: 171, gross: 279600, ctc: 279600, basic: 15000, hra: 6000, conveyance: 0, transport: 0, travelling: 0, fixed: 2300, stipend: 0 },
  { empNo: 173, gross: 228000, ctc: 228000, basic: 15000, hra: 4000, conveyance: 0, transport: 0, travelling: 0, fixed: 0, stipend: 0 },
  { empNo: 172, gross: 300000, ctc: 300000, basic: 15000, hra: 7500, conveyance: 0, transport: 0, travelling: 2500, fixed: 0, stipend: 0 },
  { empNo: 175, gross: 223500, ctc: 223500, basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixed: 3625, stipend: 0 },
  { empNo: 178, gross: 240000, ctc: 240000, basic: 15000, hra: 5000, conveyance: 0, transport: 0, travelling: 0, fixed: 0, stipend: 0 },
  { empNo: 180, gross: 180000, ctc: 180000, basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixed: 0, stipend: 0 },
  { empNo: 181, gross: 384000, ctc: 384000, basic: 15000, hra: 7500, conveyance: 0, transport: 0, travelling: 3000, fixed: 6500, stipend: 0 },
  { empNo: 184, gross: 288000, ctc: 288000, basic: 15000, hra: 7500, conveyance: 0, transport: 0, travelling: 1500, fixed: 0, stipend: 0 },
  { empNo: 183, gross: 240000, ctc: 240000, basic: 15000, hra: 5000, conveyance: 0, transport: 0, travelling: 0, fixed: 0, stipend: 0 },
  { empNo: 186, gross: 168000, ctc: 168000, basic: 14000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixed: 0, stipend: 0 },
  { empNo: 187, gross: 486000, ctc: 486000, basic: 15000, hra: 7500, conveyance: 0, transport: 0, travelling: 6000, fixed: 12000, stipend: 0 },
  { empNo: 188, gross: 168000, ctc: 168000, basic: 14000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixed: 0, stipend: 0 },
];

function mapRole(row: EmpRow): Role {
  const zr = row.zohoRole || "";
  if (zr === "Director") return "PARTNER";
  if (zr === "Management") return "MANAGEMENT";
  if (zr === "Admin") return "ADMIN";
  if (zr === "Manager") return "MANAGER";
  if (zr === "Team Leader") return "TL";
  if (zr === "HR") return "HR";
  return "EMPLOYEE";
}

function emailFor(row: EmpRow): string {
  if (row.email && row.email.includes("@")) return row.email.toLowerCase();
  if (row.personalEmail && row.personalEmail.includes("@")) return row.personalEmail.toLowerCase();
  return `emp${row.empNo}@adarshshipping.in`;
}

async function main() {
  const pw = await bcrypt.hash("password123", 10);

  console.log("Wiping existing data...");
  await prisma.auditLog.deleteMany({});
  await prisma.securityEvent.deleteMany({});
  await prisma.userSession.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.ticketComment.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.kpiReviewItem.deleteMany({});
  await prisma.kpiReview.deleteMany({});
  await prisma.kpiTemplateItem.deleteMany({});
  await prisma.kpiTemplate.deleteMany({});
  await prisma.kpiDepartment.deleteMany({});
  await prisma.criteriaOverride.deleteMany({});
  await prisma.ratingReview.deleteMany({});
  await prisma.ratingDisagreement.deleteMany({});
  await prisma.extensionRequest.deleteMany({});
  await prisma.meetingReschedule.deleteMany({});
  await prisma.arrear.deleteMany({});
  await prisma.appraisalDecision.deleteMany({});
  await prisma.mOM.deleteMany({});
  await prisma.dateVote.deleteMany({});
  await prisma.rating.deleteMany({});
  await prisma.cycleAssignment.deleteMany({});
  await prisma.selfAssessment.deleteMany({});
  await prisma.appraisalCycle.deleteMany({});
  await prisma.salaryRevision.deleteMany({});
  await prisma.employeeSalary.deleteMany({});
  await prisma.incrementSlab.deleteMany({});
  await prisma.user.deleteMany({});

  const empNoToId = new Map<number, string>();
  const usedEmails = new Set<string>();

  console.log("Creating users (pass 1: no manager link)...");
  for (const row of EMPLOYEES) {
    let email = emailFor(row);
    if (usedEmails.has(email)) email = `emp${row.empNo}@adarshshipping.in`;
    usedEmails.add(email);

    const name = `${row.firstName} ${row.lastName}`.trim();
    const salary = SALARIES.find((s) => s.empNo === row.empNo);
    const created = await prisma.user.create({
      data: {
        email,
        passwordHash: pw,
        name,
        role: mapRole(row),
        secondaryRole: row.secondaryRole ?? null,
        department: row.department,
        joiningDate: new Date(row.joiningDate),
        active: (row.employeeStatus ?? "Active") === "Active",
        currentSalary: salary ? salary.gross : null,
        employeeNumber: row.empNo,
        firstName: row.firstName,
        lastName: row.lastName,
        location: row.location,
        fatherName: row.fatherName,
        designation: row.designation,
        zohoRole: row.zohoRole,
        employmentType: row.employmentType,
        employeeStatus: row.employeeStatus,
        sourceOfHire: row.sourceOfHire,
        dob: row.dob ? new Date(row.dob) : null,
        gender: row.gender,
        maritalStatus: row.maritalStatus,
        workPhone: row.workPhone,
        personalPhone: row.personalPhone,
        personalEmail: row.personalEmail,
        presentAddress: row.presentAddress,
        permanentAddress: row.permanentAddress,
        aadhaar: row.aadhaar,
        pan: row.pan,
        uan: row.uan,
        bankName: row.bankName,
        bankAccount: row.bankAccount,
        ifsc: row.ifsc,
        accountType: row.accountType,
        stateCode: row.stateCode,
      },
    });
    empNoToId.set(row.empNo, created.id);
  }

  console.log("Linking reporting managers...");
  for (const row of EMPLOYEES) {
    if (!row.reportingManagerEmpNo) continue;
    const mgrId = empNoToId.get(row.reportingManagerEmpNo);
    const selfId = empNoToId.get(row.empNo);
    if (!mgrId || !selfId) continue;
    await prisma.user.update({ where: { id: selfId }, data: { reportingManagerId: mgrId } });
  }

  console.log("Seeding salaries...");
  for (const s of SALARIES) {
    const userId = empNoToId.get(s.empNo);
    if (!userId) continue;
    await prisma.employeeSalary.create({
      data: {
        userId,
        grossAnnum: s.gross,
        ctcAnnum: s.ctc,
        basic: s.basic,
        hra: s.hra,
        conveyance: s.conveyance,
        transport: s.transport,
        travelling: s.travelling,
        fixedAllowance: s.fixed,
        stipend: s.stipend,
      },
    });
  }

  console.log("Seeding salary revision history...");
  await seedSalaryRevisions(prisma);

  // Site admin account — hr@adarshshipping.in is the admin login, not linked to any employee
  console.log("Creating site admin account...");
  await prisma.user.upsert({
    where: { email: "hr@adarshshipping.in" },
    create: {
      email: "hr@adarshshipping.in",
      passwordHash: pw,
      name: "Site Admin",
      role: "ADMIN",
      secondaryRole: null,
      department: "Administration",
      joiningDate: new Date("2020-01-01"),
      active: true,
    },
    update: { passwordHash: pw, role: "ADMIN", active: true },
  });

  console.log("Seeding increment slabs...");
  const gradeBands = [
    { grade: "A+", label: "Outstanding", minRating: 91, maxRating: 100, hikes: [50, 30, 25] },
    { grade: "A", label: "Excellent", minRating: 81, maxRating: 90, hikes: [40, 25, 20] },
    { grade: "B+", label: "Good", minRating: 71, maxRating: 80, hikes: [25, 20, 15] },
    { grade: "B", label: "Satisfactory", minRating: 66, maxRating: 70, hikes: [20, 15, 5] },
    { grade: "C+", label: "Average", minRating: 61, maxRating: 65, hikes: [10, 5, 0] },
    { grade: "C", label: "Below Average", minRating: 51, maxRating: 60, hikes: [5, 0, 0] },
    { grade: "D", label: "Poor", minRating: 0, maxRating: 50, hikes: [0, 0, 0] },
  ];
  const salaryTiers = [
    { id: "UPTO_15K", label: "Up to INR 15,000/mo" },
    { id: "BTW_15K_30K", label: "INR 15,001-30,000/mo" },
    { id: "ABOVE_30K", label: "Above INR 30,000/mo" },
  ];
  for (const band of gradeBands) {
    for (const [index, tier] of salaryTiers.entries()) {
      await prisma.incrementSlab.create({
        data: {
          label: `Grade ${band.grade} (${tier.label})`,
          grade: band.grade,
          minRating: band.minRating,
          maxRating: band.maxRating,
          salaryTier: tier.id,
          hikePercent: band.hikes[index],
        },
      });
    }
  }

  console.log("Seeding KPI departments and templates...");
  await prisma.systemSetting.upsert({
    where: { key: KPI_MONTHLY_TARGET_SETTING },
    create: { key: KPI_MONTHLY_TARGET_SETTING, value: String(DEFAULT_KPI_MONTHLY_TARGET) },
    update: { value: String(DEFAULT_KPI_MONTHLY_TARGET) },
  });
  await prisma.systemSetting.upsert({
    where: { key: KPI_ANNUAL_TARGET_SETTING },
    create: { key: KPI_ANNUAL_TARGET_SETTING, value: String(DEFAULT_KPI_ANNUAL_TARGET) },
    update: { value: String(DEFAULT_KPI_ANNUAL_TARGET) },
  });
  await prisma.systemSetting.upsert({
    where: { key: KPI_RATING_SCALE_SETTING },
    create: { key: KPI_RATING_SCALE_SETTING, value: JSON.stringify(DEFAULT_KPI_RATING_SCALE) },
    update: { value: JSON.stringify(DEFAULT_KPI_RATING_SCALE) },
  });

  async function createTemplate(departmentId: string, departmentName: string, items: KpiSeedItem[]) {
    const template = await prisma.kpiTemplate.create({
      data: { departmentId, name: `${departmentName} KPI Template`, version: 1, active: true },
    });
    for (const [index, item] of items.entries()) {
      await prisma.kpiTemplateItem.create({
        data: {
          templateId: template.id,
          name: item.name,
          weightage: item.weightage,
          measurement: item.measurement,
          target: item.target,
          sortOrder: index + 1,
        },
      });
    }
  }

  for (const [rootIndex, root] of KPI_SEED_DEPARTMENTS.entries()) {
    const rootDepartment = await prisma.kpiDepartment.create({
      data: { name: root.name, sortOrder: rootIndex + 1 },
    });
    if (root.items) await createTemplate(rootDepartment.id, root.name, root.items);
    for (const [childIndex, child] of (root.children ?? []).entries()) {
      const childDepartment = await prisma.kpiDepartment.create({
        data: {
          name: child.name,
          parentId: rootDepartment.id,
          sortOrder: childIndex + 1,
        },
      });
      await createTemplate(childDepartment.id, child.name, child.items);
    }
  }

  const kpiDepartments = await prisma.kpiDepartment.findMany();
  const kpiByName = new Map(kpiDepartments.map((d) => [d.name, d.id]));
  const assignRules: { match: string; department: string }[] = [
    { match: "Human Resource", department: "HR" },
    { match: "Head of HR", department: "HR" },
    { match: "HR", department: "HR" },
    { match: "Accounts", department: "Accounts" },
    { match: "Freight Forwarding", department: "Freight Forwarding" },
    { match: "Custom Broker", department: "Custom Clearance" },
    { match: "Customs Broker", department: "Custom Clearance" },
    { match: "CFS Operations", department: "Custom Clearance" },
    { match: "Delivery Order", department: "Custom Clearance" },
    { match: "Administration", department: "Administration" },
  ];
  for (const rule of assignRules) {
    const kpiDepartmentId = kpiByName.get(rule.department);
    if (!kpiDepartmentId) continue;
    await prisma.user.updateMany({
      where: {
        role: { notIn: ["ADMIN", "MANAGEMENT", "PARTNER"] },
        department: { contains: rule.match, mode: "insensitive" },
      },
      data: { kpiDepartmentId },
    });
  }

  console.log(`Seed complete. ${EMPLOYEES.length} users. Default password: password123`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
