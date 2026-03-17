import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [fruits, vegetables, dairy] = await Promise.all([
    prisma.category.upsert({ where: { name: 'Fruits' }, update: {}, create: { name: 'Fruits' } }),
    prisma.category.upsert({ where: { name: 'Vegetables' }, update: {}, create: { name: 'Vegetables' } }),
    prisma.category.upsert({ where: { name: 'Dairy' }, update: {}, create: { name: 'Dairy' } }),
  ]);

  const products = [
    { name: 'Banana', description: 'Fresh Cavendish bananas', priceCents: 199, stock: 50, categoryId: fruits.id },
    { name: 'Apple', description: 'Crisp red apples', priceCents: 249, stock: 45, categoryId: fruits.id },
    { name: 'Carrot', description: 'Organic carrots', priceCents: 159, stock: 60, categoryId: vegetables.id },
    { name: 'Spinach', description: 'Baby spinach leaves', priceCents: 299, stock: 30, categoryId: vegetables.id },
    { name: 'Whole Milk', description: '1L whole milk', priceCents: 349, stock: 40, categoryId: dairy.id },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: `${product.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {
        description: product.description,
        priceCents: product.priceCents,
        stock: product.stock,
        categoryId: product.categoryId,
        deletedAt: null,
      },
      create: {
        id: `${product.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...product,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
