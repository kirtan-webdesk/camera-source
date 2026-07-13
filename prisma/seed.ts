import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@camera.local' },
    update: {},
    create: { name: 'Admin', email: 'admin@camera.local', password: hashed, role: 'ADMIN' },
  });

  await prisma.camera.createMany({
    skipDuplicates: true,
    data: [
      { name: 'Front Door', brand: 'Hikvision', model: 'DS-2CD2143G2', resolution: '4MP', frameRate: 30, isActive: true, location: 'Entrance', userId: admin.id },
      { name: 'Parking Lot', brand: 'Dahua', model: 'IPC-HDW2849H', resolution: '8MP', frameRate: 25, isActive: true, location: 'Parking', userId: admin.id },
    ],
  });

  console.log('Seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
