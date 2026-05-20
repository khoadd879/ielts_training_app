import * as crypto from 'crypto';

export class VnpayUtils {
  /**
   * Sort object keys alphabetically and build URL-encoded query string.
   * Excludes vnp_SecureHash and vnp_SecureHashType.
   * Uses encodeURIComponent so spaces become %20 (matching VNPay spec & official samples).
   */
  static sortAndBuildQueryString(
    params: Record<string, string | number>,
  ): string {
    const sortedKeys = Object.keys(params).sort((a, b) => a.localeCompare(b));
    const queryParts: string[] = [];

    for (const key of sortedKeys) {
      if (key === 'vnp_SecureHash' || key === 'vnp_SecureHashType') continue;
      const value = params[key];
      if (value === undefined || value === null || value === '') continue;
      queryParts.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
      );
    }

    return queryParts.join('&');
  }

  /**
   * Generate HMAC SHA512 signature (uppercase hex).
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
   * Verify VNPay response signature. Case-insensitive comparison because
   * VNPay sends lowercase hex on some endpoints.
   */
  static verifySignature(
    params: Record<string, string | number>,
    secretKey: string,
  ): boolean {
    const receivedHash = params['vnp_SecureHash'];
    if (!receivedHash) return false;

    const calculatedHash = this.generateSignature(params, secretKey);
    return calculatedHash.toUpperCase() === String(receivedHash).toUpperCase();
  }
}
