import * as crypto from 'crypto';

export class VnpayUtils {
  /**
   * Sort object keys alphabetically and build query string
   */
  static sortAndBuildQueryString(params: Record<string, string | number>): string {
    const sortedKeys = Object.keys(params).sort((a, b) => a.localeCompare(b));
    const queryParts: string[] = [];

    for (const key of sortedKeys) {
      if (
        key !== 'vnp_SecureHash' &&
        params[key] !== undefined &&
        params[key] !== null &&
        params[key] !== ''
      ) {
        queryParts.push(`${key}=${params[key]}`);
      }
    }

    return queryParts.join('&');
  }

  /**
   * Generate HMAC SHA512 signature
   */
  static generateSignature(
    params: Record<string, string | number>,
    secretKey: string,
  ): string {
    const queryString = this.sortAndBuildQueryString(params);
    const hmac = crypto.createHmac('sha512', secretKey);
    hmac.update(queryString);
    return hmac.digest('hex').toUpperCase();
  }

  /**
   * Verify VNPay response signature
   */
  static verifySignature(
    params: Record<string, string | number>,
    secretKey: string,
  ): boolean {
    const receivedHash = params['vnp_SecureHash'];
    if (!receivedHash) return false;

    const { vnp_SecureHash, ...paramsWithoutHash } = params;
    const calculatedHash = this.generateSignature(
      paramsWithoutHash,
      secretKey,
    );

    return calculatedHash === receivedHash;
  }
}