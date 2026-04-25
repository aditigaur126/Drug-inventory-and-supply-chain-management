const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const demoHospitals = [
  {
    hospitalName: "City Care Hospital",
    contact_number: "9000000001",
    address_line_1: "101 Main Street",
    address_line_2: "Sector 12",
    pincode: "110001",
    region: "North Zone",
    admin_name: "Aditi Gaur",
    admin_email: "citycare.admin@medinexus.demo",
    security_question: "What is your favorite place?",
    security_answer: "Delhi",
    state: "Delhi",
    departments: [
      {
        department: "Emergency",
        hod_name: "Dr. Rohan Mehta",
        hod_email: "emergency.citycare@medinexus.demo",
      },
      {
        department: "Pharmacy",
        hod_name: "Dr. Neha Sinha",
        hod_email: "pharmacy.citycare@medinexus.demo",
      },
    ],
  },
  {
    hospitalName: "Sunrise Multi-Speciality",
    contact_number: "9000000002",
    address_line_1: "22 Lake View Road",
    address_line_2: "Block B",
    pincode: "560001",
    region: "South Zone",
    admin_name: "Rahul Sharma",
    admin_email: "sunrise.admin@medinexus.demo",
    security_question: "What is your favorite movie?",
    security_answer: "Interstellar",
    state: "Karnataka",
    departments: [
      {
        department: "Cardiology",
        hod_name: "Dr. Priya Nair",
        hod_email: "cardio.sunrise@medinexus.demo",
      },
      {
        department: "General Medicine",
        hod_name: "Dr. Vivek Rao",
        hod_email: "gm.sunrise@medinexus.demo",
      },
    ],
  },
  {
    hospitalName: "Green Valley Medical Center",
    contact_number: "9000000003",
    address_line_1: "78 Park Avenue",
    address_line_2: "Near Metro Station",
    pincode: "400001",
    region: "West Zone",
    admin_name: "Sneha Kapoor",
    admin_email: "greenvalley.admin@medinexus.demo",
    security_question: "What was your first school?",
    security_answer: "St Marys",
    state: "Maharashtra",
    departments: [
      {
        department: "Orthopedics",
        hod_name: "Dr. Arjun Patel",
        hod_email: "ortho.greenvalley@medinexus.demo",
      },
      {
        department: "ICU",
        hod_name: "Dr. Meera Joshi",
        hod_email: "icu.greenvalley@medinexus.demo",
      },
    ],
  },
];

async function main() {
  const hashedPassword = await bcrypt.hash("Demo@12345", 10);

  for (const hospital of demoHospitals) {
    await prisma.hospital.upsert({
      where: { admin_email: hospital.admin_email },
      update: {
        hospitalName: hospital.hospitalName,
        contact_number: hospital.contact_number,
        address_line_1: hospital.address_line_1,
        address_line_2: hospital.address_line_2,
        pincode: hospital.pincode,
        region: hospital.region,
        admin_name: hospital.admin_name,
        security_question: hospital.security_question,
        security_answer: hospital.security_answer,
        password: hashedPassword,
        state: hospital.state,
      },
      create: {
        hospitalName: hospital.hospitalName,
        contact_number: hospital.contact_number,
        address_line_1: hospital.address_line_1,
        address_line_2: hospital.address_line_2,
        pincode: hospital.pincode,
        region: hospital.region,
        admin_name: hospital.admin_name,
        admin_email: hospital.admin_email,
        security_question: hospital.security_question,
        security_answer: hospital.security_answer,
        password: hashedPassword,
        state: hospital.state,
        departments: {
          create: hospital.departments,
        },
      },
    });
  }

  console.log("Demo hospitals seeded successfully.");
  console.log("Use password 'Demo@12345' for all seeded admin accounts.");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
