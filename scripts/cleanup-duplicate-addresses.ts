process.loadEnvFile?.(".env");

type KeepStrategy = "newest" | "oldest";

function parseKeepStrategy(): KeepStrategy {
  const raw = String(process.env.KEEP_ADDRESS ?? "newest").trim().toLowerCase();
  return raw === "oldest" ? "oldest" : "newest";
}

async function main(): Promise<void> {
  const dbModule = await import("../src/lib/db");
  const db = dbModule.db;
  const keep = parseKeepStrategy();

  const customers = await db.customer.findMany({
    select: { id: true },
  });

  let totalAddressesBefore = 0;
  let totalAddressesDeleted = 0;
  let totalOrdersRemapped = 0;
  let customersTouched = 0;

  for (const c of customers) {
    const addresses = await db.address.findMany({
      where: { customerId: c.id },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, isDefault: true, createdAt: true, updatedAt: true },
    });
    totalAddressesBefore += addresses.length;
    if (addresses.length <= 1) continue;

    customersTouched += 1;

    const sorted = [...addresses].sort((a, b) => {
      const ta = (keep === "newest" ? a.updatedAt : a.createdAt).getTime();
      const tb = (keep === "newest" ? b.updatedAt : b.createdAt).getTime();
      return keep === "newest" ? tb - ta : ta - tb;
    });

    const keepId = sorted[0]!.id;
    const deleteIds = sorted.slice(1).map((a) => a.id);

    const result = await db.$transaction(async (tx) => {
      const remap = await tx.order.updateMany({
        where: { shippingAddressId: { in: deleteIds } },
        data: { shippingAddressId: keepId },
      });

      await tx.address.update({
        where: { id: keepId },
        data: { isDefault: true },
        select: { id: true },
      });

      const del = await tx.address.deleteMany({
        where: { id: { in: deleteIds } },
      });

      return { remapped: remap.count, deleted: del.count };
    });

    totalOrdersRemapped += result.remapped;
    totalAddressesDeleted += result.deleted;
  }

  const addressesAfter = await db.address.count();
  console.log(
    JSON.stringify(
      {
        keepStrategy: keep,
        customers: customers.length,
        customersTouched,
        totalAddressesBefore,
        totalAddressesDeleted,
        totalOrdersRemapped,
        addressesAfter,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error("[cleanup-duplicate-addresses] failed", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      const dbModule = await import("../src/lib/db");
      await dbModule.db.$disconnect();
    } catch {
      // ignore
    }
  });

