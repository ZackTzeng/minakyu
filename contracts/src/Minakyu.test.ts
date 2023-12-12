import { Minakyu } from './Minakyu';
import {
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  Signature,
} from 'o1js';

let proofsEnabled = false;

// The public key of our trusted data provider
const ORACLE_PUBLIC_KEY = 'B62qmKJxJAU3Xqh9QftFfSyAhjNkT8NNsK4JqtW8zyzDHTWMotPUWom';

const AVERAGE_SALARY = Field(165000);
const BELOW_AVG = Field(100000);
const ABOVE_AVG = Field(400000);

describe('Minakyu', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: Minakyu;

  beforeAll(async () => {
    if (proofsEnabled) await Minakyu.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: senderKey, publicKey: senderAccount } =
      Local.testAccounts[1]);
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new Minakyu(zkAppAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('generates and deploys the `Minakyu` smart contract', async () => {
    await localDeploy();
    const oraclePublicKey = zkApp.oraclePublicKey.get();
    const avgSalary = zkApp.avgSalary.get();
    expect(oraclePublicKey).toEqual(PublicKey.fromBase58(ORACLE_PUBLIC_KEY));
    expect(avgSalary).toEqual(AVERAGE_SALARY);
  });

  describe('hardcoded values', () => {
    it('emits an `id` event containing the users id if their salary is under average and the provided signature is valid', async () => {
      await localDeploy();

      const id = Field(1);
      const salary = Field(787);
      const signature = Signature.fromBase58(
        '7mXGPCbSJUiYgZnGioezZm7GCy46CEUbgcCH9nrJYXQQiwwVrA5wemBX4T1XFHUw62oR2324QNnkUVXW6yYQLsPsqxZ3nsYR'
      );

      const txn = await Mina.transaction(senderAccount, () => {
        zkApp.verify(id, salary, signature);
      });
      await txn.prove();
      await txn.sign([senderKey]).send();

      const events = await zkApp.fetchEvents();
      const verifiedEventValue = events[0].event.data.toFields(null)[0];
      expect(verifiedEventValue).toEqual(id);
    });

    it('throws an error if the salary is above average even if the provided signature is valid', async () => {
      await localDeploy();

      const id = Field(1);
      const salary = ABOVE_AVG;
      const signature = Signature.fromBase58(
        '7mXXnqMx6YodEkySD3yQ5WK7CCqRL1MBRTASNhrm48oR4EPmenD2NjJqWpFNZnityFTZX5mWuHS1WhRnbdxSTPzytuCgMGuL'
      );

      expect(async () => {
        const txn = await Mina.transaction(senderAccount, () => {
          zkApp.verify(id, salary, signature);
        });
      }).rejects;
    });

    it('throws an error if the salary is under average and the provided signature is invalid', async () => {
      await localDeploy();

      const id = Field(1);
      const salary = BELOW_AVG;
      const signature = Signature.fromBase58(
        // TODO need to recompute with new key pair
        '7mXPv97hRN7AiUxBjuHgeWjzoSgL3z61a5QZacVgd1PEGain6FmyxQ8pbAYd5oycwLcAbqJLdezY7PRAUVtokFaQP8AJDEGX'
      );

      expect(async () => {
        const txn = await Mina.transaction(senderAccount, () => {
          zkApp.verify(id, salary, signature);
        });
      }).rejects;
    });
  });

  describe('actual API requests', () => {
    it('emits an `id` event containing the users id if their salary is under average and the provided signature is valid', async () => {
      await localDeploy();

      const response = await fetch(
        'http://localhost:3000/api/salary?user=1'
      );
      const data = await response.json();

      const id = Field(data.data.id);
      const salary = Field(data.data.salary);
      const signature = Signature.fromBase58(data.signature);

      const txn = await Mina.transaction(senderAccount, () => {
        zkApp.verify(id, salary, signature);
      });
      await txn.prove();
      await txn.sign([senderKey]).send();

      const events = await zkApp.fetchEvents();
      const verifiedEventValue = events[0].event.data.toFields(null)[0];
      expect(verifiedEventValue).toEqual(id);
    });

    it('throws an error if the salary is above average even if the provided signature is valid', async () => {
      await localDeploy();

      const response = await fetch(
        'http://localhost:3000/api/salary?user=2'
      );
      const data = await response.json();

      const id = Field(data.data.id);
      const salary = ABOVE_AVG;
      const signature = Signature.fromBase58(data.signature);

      expect(async () => {
        const txn = await Mina.transaction(senderAccount, () => {
          zkApp.verify(id, salary, signature);
        });
      }).rejects;
    });
  });
});
