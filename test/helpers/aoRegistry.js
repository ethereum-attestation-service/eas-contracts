const BaseContract = require('./baseContract');

const AORegistryContract = artifacts.require('AORegistry');

class AORegistry extends BaseContract {
  static async new() {
    const registry = new AORegistry();
    await registry.deploy();

    return registry;
  }

  async deploy() {
    this.contract = await AORegistryContract.new();
  }

  static getEvents() {
    return {
      registered: 'Registered'
    };
  }

  async getVersion() {
    return this.contract.VERSION.call();
  }

  async getAO(id) {
    const ao = await this.contract.getAO.call(id);

    return {
      id: ao[0],
      schema: ao[1],
      verifier: ao[2]
    };
  }

  async getAOCount() {
    return this.contract.aoCount.call();
  }

  async register(schema, verifier) {
    let encodedSchema = schema;
    if (typeof schema === 'string' && !schema.startsWith('0x')) {
      encodedSchema = web3.utils.asciiToHex(encodedSchema);
    }

    return this.contract.register(encodedSchema, AORegistry.getAddress(verifier));
  }
}

module.exports = AORegistry;
