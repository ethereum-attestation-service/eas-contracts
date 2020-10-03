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
}

export default BaseContract;
