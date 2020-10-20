class BaseContract {
  getAddress() {
    return this.contract.address;
  }

  static getAddress(obj) {
    if (obj instanceof Object) {
      if (typeof obj.getAddress === 'function') {
        return obj.getAddress();
      }

      return obj.address;
    }

    return obj;
  }

  static toBytes32(data) {
    let bytes = data;

    if (!bytes.startsWith('0x')) {
      bytes = `0x${bytes}`;
    }

    const strLength = 2 + 2 * 32; // '0x' + 32 words.
    return bytes.padEnd(strLength, '0');
  }
}

module.exports = BaseContract;
