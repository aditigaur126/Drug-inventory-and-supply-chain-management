const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const itemCatalog = [
  {
    item_name: "Paracetamol 650mg",
    description: "Analgesic and antipyretic tablets",
    unit_price: 2.5,
    supplier: "Medline Distributors",
    category: "Analgesic",
  },
  {
    item_name: "Amoxicillin 500mg",
    description: "Broad-spectrum antibiotic capsules",
    unit_price: 6.75,
    supplier: "CarePlus Pharma",
    category: "Antibiotic",
  },
  {
    item_name: "Insulin Glargine",
    description: "Long-acting insulin injection",
    unit_price: 245,
    supplier: "HealthCore Biologics",
    category: "Endocrine",
  },
  {
    item_name: "Atorvastatin 20mg",
    description: "Lipid-lowering tablets",
    unit_price: 8.2,
    supplier: "LifeMeds Supply",
    category: "Cardiology",
  },
  {
    item_name: "Ceftriaxone 1g",
    description: "Injectable antibiotic vial",
    unit_price: 38,
    supplier: "CarePlus Pharma",
    category: "Antibiotic",
  },
  {
    item_name: "IV Fluid NS 500ml",
    description: "Normal saline infusion",
    unit_price: 28,
    supplier: "Medline Distributors",
    category: "Critical Care",
  },
  {
    item_name: "Pantoprazole 40mg",
    description: "Acid suppressant tablets",
    unit_price: 4.4,
    supplier: "LifeMeds Supply",
    category: "Gastro",
  },
  {
    item_name: "Diclofenac Injection",
    description: "Pain management injection",
    unit_price: 19.5,
    supplier: "HealthCore Biologics",
    category: "Analgesic",
  },
];

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
    inventory: [
      {
        department: "Emergency",
        item_name: "Paracetamol 650mg",
        supplier: "Medline Distributors",
        batch_number: "CC-PARA-2401",
        expiryInDays: 210,
        quantity: 180,
        threshold_quantity: 40,
      },
      {
        department: "Pharmacy",
        item_name: "Amoxicillin 500mg",
        supplier: "CarePlus Pharma",
        batch_number: "CC-AMOX-2403",
        expiryInDays: 120,
        quantity: 72,
        threshold_quantity: 25,
      },
      {
        department: "Emergency",
        item_name: "IV Fluid NS 500ml",
        supplier: "Medline Distributors",
        batch_number: "CC-NS-2404",
        expiryInDays: 60,
        quantity: 26,
        threshold_quantity: 30,
      },
      {
        department: "Pharmacy",
        item_name: "Pantoprazole 40mg",
        supplier: "LifeMeds Supply",
        batch_number: "CC-PANTO-2402",
        expiryInDays: 300,
        quantity: 150,
        threshold_quantity: 35,
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
    inventory: [
      {
        department: "Cardiology",
        item_name: "Atorvastatin 20mg",
        supplier: "LifeMeds Supply",
        batch_number: "SR-ATOR-2401",
        expiryInDays: 340,
        quantity: 210,
        threshold_quantity: 60,
      },
      {
        department: "General Medicine",
        item_name: "Paracetamol 650mg",
        supplier: "Medline Distributors",
        batch_number: "SR-PARA-2405",
        expiryInDays: 280,
        quantity: 190,
        threshold_quantity: 50,
      },
      {
        department: "General Medicine",
        item_name: "Insulin Glargine",
        supplier: "HealthCore Biologics",
        batch_number: "SR-INS-2402",
        expiryInDays: 95,
        quantity: 18,
        threshold_quantity: 20,
      },
      {
        department: "Cardiology",
        item_name: "Ceftriaxone 1g",
        supplier: "CarePlus Pharma",
        batch_number: "SR-CEF-2402",
        expiryInDays: 145,
        quantity: 48,
        threshold_quantity: 22,
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
    inventory: [
      {
        department: "Orthopedics",
        item_name: "Diclofenac Injection",
        supplier: "HealthCore Biologics",
        batch_number: "GV-DICLO-2401",
        expiryInDays: 180,
        quantity: 64,
        threshold_quantity: 24,
      },
      {
        department: "ICU",
        item_name: "IV Fluid NS 500ml",
        supplier: "Medline Distributors",
        batch_number: "GV-NS-2403",
        expiryInDays: 70,
        quantity: 22,
        threshold_quantity: 28,
      },
      {
        department: "ICU",
        item_name: "Ceftriaxone 1g",
        supplier: "CarePlus Pharma",
        batch_number: "GV-CEF-2404",
        expiryInDays: 132,
        quantity: 43,
        threshold_quantity: 25,
      },
      {
        department: "Orthopedics",
        item_name: "Pantoprazole 40mg",
        supplier: "LifeMeds Supply",
        batch_number: "GV-PANTO-2401",
        expiryInDays: 260,
        quantity: 88,
        threshold_quantity: 30,
      },
    ],
  },
  {
    hospitalName: "Demo Hospital",
    contact_number: "9000000099",
    address_line_1: "44 Innovation Park",
    address_line_2: "Tech District",
    pincode: "122002",
    region: "North Zone",
    admin_name: "Aditi Gaur",
    admin_email: "aditigaur126@gmail.com",
    admin_password: "Aditi*123",
    security_question: "What is your favorite place?",
    security_answer: "Gurgaon",
    state: "Haryana",
    departments: [
      {
        department: "Emergency",
        hod_name: "Dr. Ananya Verma",
        hod_email: "emergency.demohospital@medinexus.demo",
      },
      {
        department: "Pharmacy",
        hod_name: "Dr. Karan Malhotra",
        hod_email: "pharmacy.demohospital@medinexus.demo",
      },
    ],
    inventory: [
      {
        department: "Emergency",
        item_name: "Paracetamol 650mg",
        supplier: "Medline Distributors",
        batch_number: "DH-PARA-2401",
        expiryInDays: 240,
        quantity: 220,
        threshold_quantity: 60,
      },
      {
        department: "Pharmacy",
        item_name: "Amoxicillin 500mg",
        supplier: "CarePlus Pharma",
        batch_number: "DH-AMOX-2401",
        expiryInDays: 150,
        quantity: 95,
        threshold_quantity: 35,
      },
      {
        department: "Emergency",
        item_name: "IV Fluid NS 500ml",
        supplier: "Medline Distributors",
        batch_number: "DH-NS-2402",
        expiryInDays: 75,
        quantity: 24,
        threshold_quantity: 30,
      },
      {
        department: "Pharmacy",
        item_name: "Ceftriaxone 1g",
        supplier: "CarePlus Pharma",
        batch_number: "DH-CEF-2403",
        expiryInDays: 118,
        quantity: 52,
        threshold_quantity: 26,
      },
    ],
  },
  {
    hospitalName: "Aadvi Care Hospital",
    contact_number: "9000000101",
    address_line_1: "12 Heritage Avenue",
    address_line_2: "Sector 45",
    pincode: "110048",
    region: "North Zone",
    admin_name: "Aadvi Singh",
    admin_email: "aadvisingh01@gmail.com",
    admin_password: "Aadvi*123",
    security_question: "What is your favorite place?",
    security_answer: "Delhi",
    state: "Delhi",
    departments: [
      {
        department: "Emergency",
        hod_name: "Dr. Ritu Anand",
        hod_email: "emergency.aadvicare@medinexus.demo",
      },
      {
        department: "Pharmacy",
        hod_name: "Dr. Nishant Arora",
        hod_email: "pharmacy.aadvicare@medinexus.demo",
      },
      {
        department: "General Medicine",
        hod_name: "Dr. Komal Bansal",
        hod_email: "gm.aadvicare@medinexus.demo",
      },
    ],
    inventory: [
      {
        department: "Emergency",
        item_name: "Paracetamol 650mg",
        supplier: "Medline Distributors",
        batch_number: "AC-PARA-2401",
        expiryInDays: 230,
        quantity: 260,
        threshold_quantity: 70,
      },
      {
        department: "Pharmacy",
        item_name: "Amoxicillin 500mg",
        supplier: "CarePlus Pharma",
        batch_number: "AC-AMOX-2402",
        expiryInDays: 140,
        quantity: 115,
        threshold_quantity: 40,
      },
      {
        department: "General Medicine",
        item_name: "Pantoprazole 40mg",
        supplier: "LifeMeds Supply",
        batch_number: "AC-PANTO-2401",
        expiryInDays: 290,
        quantity: 140,
        threshold_quantity: 45,
      },
      {
        department: "Emergency",
        item_name: "IV Fluid NS 500ml",
        supplier: "Medline Distributors",
        batch_number: "AC-NS-2403",
        expiryInDays: 68,
        quantity: 28,
        threshold_quantity: 35,
      },
      {
        department: "Pharmacy",
        item_name: "Ceftriaxone 1g",
        supplier: "CarePlus Pharma",
        batch_number: "AC-CEF-2404",
        expiryInDays: 132,
        quantity: 58,
        threshold_quantity: 30,
      },
    ],
  },
];

async function main() {
  const hashedPassword = await bcrypt.hash("Demo@12345", 10);

  for (const catalogItem of itemCatalog) {
    await prisma.item.upsert({
      where: {
        item_name_supplier: {
          item_name: catalogItem.item_name,
          supplier: catalogItem.supplier,
        },
      },
      update: {
        description: catalogItem.description,
        unit_price: catalogItem.unit_price,
        category: catalogItem.category,
      },
      create: catalogItem,
    });
  }

  const hospitalsByName: Record<string, { id: string }> = {};

  for (const hospital of demoHospitals) {
    const hospitalPasswordHash = hospital.admin_password
      ? await bcrypt.hash(hospital.admin_password, 10)
      : hashedPassword;

    const hospitalRecord = await prisma.hospital.upsert({
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
        password: hospitalPasswordHash,
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
        password: hospitalPasswordHash,
        state: hospital.state,
        departments: {
          create: hospital.departments,
        },
      },
    });

    hospitalsByName[hospital.hospitalName] = { id: hospitalRecord.id };

    for (const department of hospital.departments) {
      await prisma.departments.upsert({
        where: { hod_email: department.hod_email },
        update: {
          department: department.department,
          hod_name: department.hod_name,
          hospital_id: hospitalRecord.id,
        },
        create: {
          hospital_id: hospitalRecord.id,
          department: department.department,
          hod_name: department.hod_name,
          hod_email: department.hod_email,
        },
      });
    }

    const departments = await prisma.departments.findMany({
      where: { hospital_id: hospitalRecord.id },
    });

    const departmentMap = departments.reduce(
      (acc: Record<string, { id: string }>, dept: { department: string; id: string }) => {
        acc[dept.department] = { id: dept.id };
        return acc;
      },
      {}
    );

    await prisma.cartItem.deleteMany({
      where: {
        cart: {
          hospital_id: hospitalRecord.id,
        },
      },
    });
    await prisma.cart.deleteMany({ where: { hospital_id: hospitalRecord.id } });
    await prisma.orderItem.deleteMany({ where: { order: { hospital_id: hospitalRecord.id } } });
    await prisma.order.deleteMany({ where: { hospital_id: hospitalRecord.id } });
    await prisma.notification.deleteMany({ where: { hospital_id: hospitalRecord.id } });
    await prisma.systemCheck.deleteMany({ where: { hospital_id: hospitalRecord.id } });
    await prisma.stockReplenishmentLog.deleteMany({
      where: {
        medicalInventory: {
          hospital_id: hospitalRecord.id,
        },
      },
    });
    await prisma.medicalInventory.deleteMany({ where: { hospital_id: hospitalRecord.id } });
    await prisma.bloodBank.deleteMany({ where: { hospital_id: hospitalRecord.id } });

    const createdInventories: Array<{ id: string; quantity: number; threshold_quantity: number; item_name: string; department_id: string }> = [];

    for (const inventory of hospital.inventory) {
      const item = await prisma.item.findUnique({
        where: {
          item_name_supplier: {
            item_name: inventory.item_name,
            supplier: inventory.supplier,
          },
        },
      });

      if (!item) {
        continue;
      }

      const department = departmentMap[inventory.department];
      if (!department) {
        continue;
      }

      const medicalInventory = await prisma.medicalInventory.create({
        data: {
          department_id: department.id,
          hospital_id: hospitalRecord.id,
          item_id: item.item_id,
          batch_number: inventory.batch_number,
          expiry_date: addDays(inventory.expiryInDays),
          quantity: inventory.quantity,
          threshold_quantity: inventory.threshold_quantity,
        },
      });

      createdInventories.push({
        id: medicalInventory.id,
        quantity: medicalInventory.quantity,
        threshold_quantity: medicalInventory.threshold_quantity,
        item_name: item.item_name,
        department_id: department.id,
      });
    }

    // Create multiple orders with different statuses and dates
    const pendingOrderItems = createdInventories.slice(0, 2);
    const successOrderItems = createdInventories.slice(2, 4);
    const delayedOrderItems = createdInventories.slice(4, 6);

    // PENDING Order (created 2 days ago, expected delivery in 3 days)
    const pendingOrderTotal = await pendingOrderItems.reduce(async (sumPromise, inventoryItem) => {
      const sum = await sumPromise;
      const linkedInventory = await prisma.medicalInventory.findUnique({
        where: { id: inventoryItem.id },
        include: { item: true },
      });
      if (!linkedInventory) return sum;
      return sum + linkedInventory.item.unit_price * 30;
    }, Promise.resolve(0));

    const pendingOrderDate = new Date();
    pendingOrderDate.setDate(pendingOrderDate.getDate() - 2);

    const pendingOrder = await prisma.order.create({
      data: {
        hospital_id: hospitalRecord.id,
        status: "PENDING",
        payment_status: false,
        order_date: pendingOrderDate,
        expected_delivery_date: addDays(3),
        total_amount: pendingOrderTotal || 0,
      },
    });

    for (const inventoryItem of pendingOrderItems) {
      const linkedInventory = await prisma.medicalInventory.findUnique({
        where: { id: inventoryItem.id },
        include: { item: true },
      });

      if (!linkedInventory) continue;

      await prisma.orderItem.create({
        data: {
          order_id: pendingOrder.id,
          item_id: linkedInventory.item_id,
          quantity: 30,
          unit_price: linkedInventory.item.unit_price,
          department_id: inventoryItem.department_id,
          medical_inventory_id: linkedInventory.id,
          orderPlaced: false,
        },
      });
    }

    // DELIVERED Order (created 8 days ago, delivered on time 3 days ago)
    const successOrderTotal = await successOrderItems.reduce(async (sumPromise, inventoryItem) => {
      const sum = await sumPromise;
      const linkedInventory = await prisma.medicalInventory.findUnique({
        where: { id: inventoryItem.id },
        include: { item: true },
      });
      if (!linkedInventory) return sum;
      return sum + linkedInventory.item.unit_price * 20;
    }, Promise.resolve(0));

    const successOrderDate = new Date();
    successOrderDate.setDate(successOrderDate.getDate() - 8);

    const successOrder = await prisma.order.create({
      data: {
        hospital_id: hospitalRecord.id,
        status: "SUCCESS",
        payment_status: true,
        order_date: successOrderDate,
        expected_delivery_date: addDays(-3),
        total_amount: successOrderTotal || 0,
      },
    });

    for (const inventoryItem of successOrderItems) {
      const linkedInventory = await prisma.medicalInventory.findUnique({
        where: { id: inventoryItem.id },
        include: { item: true },
      });

      if (!linkedInventory) continue;

      await prisma.orderItem.create({
        data: {
          order_id: successOrder.id,
          item_id: linkedInventory.item_id,
          quantity: 20,
          unit_price: linkedInventory.item.unit_price,
          department_id: inventoryItem.department_id,
          medical_inventory_id: linkedInventory.id,
          orderPlaced: true,
        },
      });
    }

    // DELAYED Order (created 15 days ago, expected delivery was 7 days ago, still PENDING)
    if (delayedOrderItems.length > 0) {
      const delayedOrderTotal = await delayedOrderItems.reduce(async (sumPromise, inventoryItem) => {
        const sum = await sumPromise;
        const linkedInventory = await prisma.medicalInventory.findUnique({
          where: { id: inventoryItem.id },
          include: { item: true },
        });
        if (!linkedInventory) return sum;
        return sum + linkedInventory.item.unit_price * 25;
      }, Promise.resolve(0));

      const delayedOrderDate = new Date();
      delayedOrderDate.setDate(delayedOrderDate.getDate() - 15);

      const delayedOrder = await prisma.order.create({
        data: {
          hospital_id: hospitalRecord.id,
          status: "PENDING",
          payment_status: false,
          order_date: delayedOrderDate,
          expected_delivery_date: addDays(-7),
          total_amount: delayedOrderTotal || 0,
        },
      });

      for (const inventoryItem of delayedOrderItems) {
        const linkedInventory = await prisma.medicalInventory.findUnique({
          where: { id: inventoryItem.id },
          include: { item: true },
        });

        if (!linkedInventory) continue;

        await prisma.orderItem.create({
          data: {
            order_id: delayedOrder.id,
            item_id: linkedInventory.item_id,
            quantity: 25,
            unit_price: linkedInventory.item.unit_price,
            department_id: inventoryItem.department_id,
            medical_inventory_id: linkedInventory.id,
            orderPlaced: true,
          },
        });
      }
    }

    // Additional orders for better dashboard analytics (more delivered orders from the past)
    if (createdInventories.length >= 6) {
      for (let i = 0; i < 3; i++) {
        const inventorySubset = createdInventories.slice(i * 2, Math.min((i + 1) * 2 + 1, createdInventories.length));
        
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - (20 + i * 5));
        
        const deliveryDate = new Date(orderDate);
        deliveryDate.setDate(deliveryDate.getDate() + (4 + Math.random() * 2));

        let orderTotal = 0;
        const order = await prisma.order.create({
          data: {
            hospital_id: hospitalRecord.id,
            status: "SUCCESS",
            payment_status: true,
            order_date: orderDate,
            expected_delivery_date: deliveryDate,
            total_amount: 5000 + Math.random() * 15000,
          },
        });

        for (const inventoryItem of inventorySubset) {
          const linkedInventory = await prisma.medicalInventory.findUnique({
            where: { id: inventoryItem.id },
            include: { item: true },
          });

          if (!linkedInventory) continue;

          const qty = 15 + Math.floor(Math.random() * 35);
          await prisma.orderItem.create({
            data: {
              order_id: order.id,
              item_id: linkedInventory.item_id,
              quantity: qty,
              unit_price: linkedInventory.item.unit_price,
              department_id: inventoryItem.department_id,
              medical_inventory_id: linkedInventory.id,
              orderPlaced: true,
            },
          });
        }
      }
    }

    const cart = await prisma.cart.create({
      data: {
        hospital_id: hospitalRecord.id,
      },
    });

    for (const inventoryItem of pendingOrderItems) {
      const linkedInventory = await prisma.medicalInventory.findUnique({
        where: { id: inventoryItem.id },
        include: { item: true },
      });

      if (!linkedInventory) continue;

      await prisma.cartItem.create({
        data: {
          cart_id: cart.id,
          item_id: linkedInventory.item_id,
          quantity: 12,
          unit_price: linkedInventory.item.unit_price,
          department_id: inventoryItem.department_id,
          medical_inventory_id: linkedInventory.id,
        },
      });
    }

    const lowStockItems = createdInventories.filter(
      (inventoryItem) => inventoryItem.quantity <= inventoryItem.threshold_quantity
    );

    for (const lowStockItem of lowStockItems) {
      await prisma.notification.create({
        data: {
          hospital_id: hospitalRecord.id,
          department_id: lowStockItem.department_id,
          type: "LOW_STOCK",
          message: `${lowStockItem.item_name} is low in stock. Please replenish soon.`,
          status: "UNREAD",
          visibility: true,
          inventory_id: lowStockItem.id,
          item_name: lowStockItem.item_name,
          current_quantity: lowStockItem.quantity,
          threshold_quantity: lowStockItem.threshold_quantity,
        },
      });
    }

    await prisma.notification.create({
      data: {
        hospital_id: hospitalRecord.id,
        type: "ORDER_STATUS",
        message: `Purchase request ${pendingOrder.id.slice(0, 8)} is pending approval.`,
        status: "UNREAD",
        visibility: true,
      },
    });

    await prisma.notification.create({
      data: {
        hospital_id: hospitalRecord.id,
        type: "ORDER_STATUS",
        message: `Order ${successOrder.id.slice(0, 8)} has been delivered successfully.`,
        status: "READ",
        visibility: true,
        read_at: new Date(),
      },
    });

    await prisma.bloodBank.createMany({
      data: [
        {
          hospital_id: hospitalRecord.id,
          blood_type: "O+",
          quantity_in_stock: 24,
          expiry_date: addDays(35),
        },
        {
          hospital_id: hospitalRecord.id,
          blood_type: "A+",
          quantity_in_stock: 18,
          expiry_date: addDays(28),
        },
      ],
    });

    await prisma.systemCheck.create({
      data: {
        hospital_id: hospitalRecord.id,
        type: "INVENTORY_PERIODIC_CHECK",
      },
    });
  }

  const cityCareId = hospitalsByName["City Care Hospital"]?.id;
  const sunriseId = hospitalsByName["Sunrise Multi-Speciality"]?.id;
  const greenValleyId = hospitalsByName["Green Valley Medical Center"]?.id;

  if (cityCareId && sunriseId) {
    await prisma.resourceSharing.deleteMany({
      where: {
        donor_hospital_id: cityCareId,
        receiver_hospital_id: sunriseId,
        item_name: "Ceftriaxone 1g",
      },
    });

    await prisma.resourceSharing.create({
      data: {
        donor_hospital_id: cityCareId,
        receiver_hospital_id: sunriseId,
        item_name: "Ceftriaxone 1g",
        quantity_shared: 10,
        sharing_date: new Date(),
      },
    });
  }

  if (greenValleyId && cityCareId) {
    await prisma.resourceSharing.deleteMany({
      where: {
        donor_hospital_id: greenValleyId,
        receiver_hospital_id: cityCareId,
        item_name: "IV Fluid NS 500ml",
      },
    });

    await prisma.resourceSharing.create({
      data: {
        donor_hospital_id: greenValleyId,
        receiver_hospital_id: cityCareId,
        item_name: "IV Fluid NS 500ml",
        quantity_shared: 15,
        sharing_date: new Date(),
      },
    });
  }

  console.log("Demo hospitals, inventory, requests/orders, and notifications seeded successfully.");
  console.log("Use password 'Demo@12345' for seeded demo admins (except custom accounts below).");
  console.log("Use password 'Aditi*123' for aditigaur126@gmail.com.");
  console.log("Use password 'Aadvi*123' for aadvisingh01@gmail.com.");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
