import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// @ts-ignore
import Client from 'mina-signer';
const client = new Client({ network: 'testnet' });

// Implement toJSON for BigInt so we can include values in response
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

function getSignedSalary(userId: number) {
  // The private key of our account. When running locally the hardcoded key will
  // be used. In production the key will be loaded from a Vercel environment
  // variable.
  let privateKey =
    process.env.PRIVATE_KEY ??
    'EKEZr2Ph9epAqqRVA7vcHj4A7bnjDZAfoAxoDvk8jrgLULL94V4J';

  const knownSalary = (userId: number) => (userId === 1 ? 787 : 536);
  const salary = knownSalary(userId);

  // Use our private key to sign an array of numbers containing the users id and
  // salary
  const signature = client.signFields(
    [BigInt(userId), BigInt(salary)],
    privateKey
  );
  console.log(signature)
  return {
    data: { id: userId, salary: salary },
    signature: signature.signature,
    publicKey: signature.publicKey,
  };
}

export function GET(request: NextRequest) {
  const searchParams = new URLSearchParams(request.nextUrl.search);
  return NextResponse.json(
    getSignedSalary(+(searchParams.get('user') ?? 0)),
    { status: 200 }
  );
}
