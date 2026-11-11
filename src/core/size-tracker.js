/**
 * SizeTracker monitors the number of bytes written to a Node.js response object.
 */

class SizeTracker {
  constructor() {
    this.bytes = 0;
    this.originalWrite = null;
    this.originalEnd = null;
    this.res = null;
  }

  /**
   * Hooks into the response object's write and end methods.
   * @param {import('http').ServerResponse} res
   */
  start(res) {
    this.res = res;
    this.bytes = 0;

    this.originalWrite = res.write;
    this.originalEnd = res.end;

    const self = this;

    res.write = function (chunk, encoding, callback) {
      if (chunk) {
        self.bytes += Buffer.byteLength(chunk, encoding);
      }
      return self.originalWrite.call(res, chunk, encoding, callback);
    };

    res.end = function (chunk, encoding, callback) {
      if (chunk) {
        self.bytes += Buffer.byteLength(chunk, encoding);
      }
      return self.originalEnd.call(res, chunk, encoding, callback);
    };
  }

  /**
   * Restores the original response methods.
   */
  cleanup() {
    if (this.res) {
      this.res.write = this.originalWrite;
      this.res.end = this.originalEnd;
    }
  }
}

module.exports = { SizeTracker };
