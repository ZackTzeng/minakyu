import {
  Field,
  SmartContract,
  state,
  State,
  method,
  PublicKey,
  Signature,
} from 'o1js';

// The public key of our trusted data provider
const ORACLE_PUBLIC_KEY = 'B62qmKJxJAU3Xqh9QftFfSyAhjNkT8NNsK4JqtW8zyzDHTWMotPUWom';
const AVERAGE_SALARY = 165000;

export class Minakyu extends SmartContract {
  // Define contract state
  @state(PublicKey) oraclePublicKey = State<PublicKey>();
  @state(Field) avgSalary = State<Field>();

  // Define contract events
  events = {
    verified: Field,
  };

  init() {
    super.init();
    // Initialize contract state
    this.oraclePublicKey.set(PublicKey.fromBase58(ORACLE_PUBLIC_KEY));
    this.avgSalary.set(Field(AVERAGE_SALARY));

    // Specify that caller should include signature with tx instead of proof
    this.requireSignature();
  }

  // verify and emit the finding of talents under compensated
  @method verify(id: Field, salary: Field, signature: Signature) {
    // Get the oracle public key from the contract state
    const oraclePublicKey = this.oraclePublicKey.get();
    this.oraclePublicKey.assertEquals(oraclePublicKey);
    // Evaluate whether the signature is valid for the provided data
    const validSignature = signature.verify(oraclePublicKey, [id, salary]);
    // Check that the signature is valid
    validSignature.assertTrue();
    // Check that the provided salary is under average
    const currentAvg = this.avgSalary.get();
    this.avgSalary.assertEquals(this.avgSalary.get());
    salary.assertLessThan(currentAvg);
    // Emit an event containing the verified users id
    this.emitEvent('verified', id);
  }
}
