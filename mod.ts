// NOTE: Struct.subarray() should be much faster than Struct.slice(), but doesn't seem to work. ~JD 2019-08-06

import endianess from 'https://raw.github.com/denolibs/endianness/master/mod.ts';

/** Creates a (Uint8Array compatible) Struct. */
export default class Struct extends Uint8Array {
  private autoExpand: boolean;
  private cursorPos: number;
  private schema: string[];
  private types: Map<string, Function[]>;
  public readonly littleEndian = endianess.little;

  public constructor(size: number = 0, autoExpand = true) {
    super(size);
    this.autoExpand = autoExpand; // We will auto-size (slower) if no size was specified.
    this.cursorPos = 0;
    this.schema = [];
    this.types = new Map();

    this.addInternalTypes();

    // Ugly af. Get this shit sorted out JD.
    this.addType(
      'string',
      (readBytes: (n: number) => Uint8Array, peek: Struct): string => {
        // TODO: TypeData^^
        const strLen = peek.indexOf(0); // Find the first NUL terminator (\0)
        const uint8Array = readBytes(strLen + 1); // Get binary string
        return new TextDecoder().decode(uint8Array.slice(0, strLen).buffer); // Return an (UTF8) string;
      },
      (str: string): Uint8Array => {
        str += '\0'; // Add a NUL terminator, so we will always find one!
        str = str.substr(0, str.indexOf('\0') + 1); // Only include the first NUL terminator
        return new TextEncoder().encode(str); // Return the Uint8Array holding the data
      },
    );
  }

  /** Adds a type to be used in the Struct */
  // NOTE: It's important for the callback to call readBytes(len) as this defines the struct's binary length.
  public addType(
    name: string,
    readFn: (readBytes: (n: number) => Uint8Array, peek: Struct) => unknown,
    // TODO: TypeData^^
    writeFn: Function,
  ): void {
    this.types.set(name, [readFn, writeFn]);
  }

  /** Adds 26 numerical types by leveraging types from DataView */
  private addInternalTypes(): void {
    const dataViewTypes: [string, number, string, string, boolean?][] = [
      ['int8', 1, 'getInt8', 'setInt8'], // Byte
      ['uint8', 1, 'getUint8', 'setUint8'], // Unsigned Byte
      ['int16', 2, 'getInt16', 'setInt16', this.littleEndian], // Short
      ['int16LE', 2, 'getInt16', 'setInt16', true],
      ['int16BE', 2, 'getInt16', 'setInt16', false],
      ['uint16', 2, 'getUint16', 'setUint16', this.littleEndian], // Unsigned Short
      ['uint16LE', 2, 'getUint16', 'setUint16', true],
      ['uint16BE', 2, 'getUint16', 'setUint16', false],
      ['int32', 4, 'getInt32', 'setInt32', this.littleEndian], // Long
      ['int32LE', 4, 'getInt32', 'setInt32', true],
      ['int32BE', 4, 'getInt32', 'setInt32', false],
      ['uint32', 4, 'getUint32', 'setUint32', this.littleEndian], // Unsigned Long
      ['uint32LE', 4, 'getUint32', 'setUint32', true],
      ['uint32BE', 4, 'getUint32', 'setUint32', false],
      ['float32', 4, 'getFloat32', 'setFloat32', this.littleEndian], // Float
      ['float32LE', 4, 'getFloat32', 'setFloat32', true],
      ['float32BE', 4, 'getFloat32', 'setFloat32', false],
      ['float64', 8, 'getFloat64', 'setFloat64', this.littleEndian], // Double
      ['float64LE', 8, 'getFloat64', 'setFloat64', true],
      ['float64BE', 8, 'getFloat64', 'setFloat64', false],
      ['bigInt64', 8, 'getBigInt64', 'setBigInt64', this.littleEndian], // Long Long
      ['bigInt64LE', 8, 'getBigInt64', 'setBigInt64', true],
      ['bigInt64BE', 8, 'getBigInt64', 'setBigInt64', false],
      ['bigUint64', 8, 'getBigUint64', 'setBigUint64', this.littleEndian], // Unsigned Long Long
      ['bigUint64LE', 8, 'getBigUint64', 'setBigUint64', true],
      ['bigUint64BE', 8, 'getBigUint64', 'setBigUint64', false],
    ];

    // TODO: Fix types (no any!)
    for (const internalType of dataViewTypes) {
      const [name, length, getter, setter, isLE] = internalType;
      this.addType(
        name as string, // byte
        (readBytes: (n: number) => Uint8Array): number => {
          return (new DataView(readBytes(length as number).buffer) as any)[getter](0, isLE);
        },
        (n: number): Uint8Array => {
          const view = new DataView(new ArrayBuffer(1)) as any;
          view[setter](0, n, isLE);
          return new Uint8Array(view.buffer);
        },
      );
    }
  }

  /** Convenience method - Calls struct.write(...) */
  public bigInt64(n: string): Struct {
    return this.write('bigInt64', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public bigInt64LE(n: string): Struct {
    return this.write('bigInt64LE', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public bigInt64BE(n: string): Struct {
    return this.write('bigInt64BE', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public bigUint64(n: string): Struct {
    return this.write('bigUint64', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public bigUint64LE(n: string): Struct {
    return this.write('bigUint64LE', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public bigUint64BE(n: string): Struct {
    return this.write('bigUint64BE', n);
  }

  // public char(char: string | number): Struct {
  //   // TODO: Consider char array.
  //   if (typeof char === 'string') {
  //     char = unescape(encodeURI(char)).charCodeAt(0); // Get first Char (byte) only. Will fuck up your multi-byte characters.
  //   }
  //   this.schema.push('Char');
  //   return this.write([char]);
  // }

  /** Convenience method - Calls struct.write(...) */
  public float32(n: string): Struct {
    return this.write('float32', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public float32LE(n: string): Struct {
    return this.write('float32LE', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public float32BE(n: string): Struct {
    return this.write('float32BE', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public float64(n: string): Struct {
    return this.write('float64', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public float64LE(n: string): Struct {
    return this.write('float64LE', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public float64BE(n: string): Struct {
    return this.write('float64BE', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public int8(n: string): Struct {
    return this.write('int8', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public int16(n: string): Struct {
    return this.write('int16', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public int16LE(n: string): Struct {
    return this.write('int16LE', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public int16BE(n: string): Struct {
    return this.write('int16BE', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public int32(n: string): Struct {
    return this.write('int32', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public int32LE(n: string): Struct {
    return this.write('int32LE', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public int32BE(n: string): Struct {
    return this.write('int32BE', n);
  }

  /** Creates a new Struct from an existing Struct / Uint8Array */
  public static from(source: Struct | Uint8Array): Struct {
    const struct = new Struct(source.length, false);
    struct.set(source);
    struct.cursorPos = source.length;
    return struct;
  }

  /** Reads data from the Struct using the schema specified */
  public read(schema?: string[]): (unknown)[] {
    schema = schema || this.schema;
    let array = this.subarray(0);
    const readBytes = (n: number): Uint8Array => {
      if (n > array.length) {
        throw Error('Struct.read() failure: Attempting to read beyond struct buffer');
      }
      const bytes = array.slice(0, n);
      array = array.slice(n);
      return bytes;
    };
    const retValue: (string | number)[] = [];
    while (schema.length > 0) {
      const type: string = schema.shift() as string;
      if (!this.types.has(type)) {
        throw TypeError(`Struct.read() failure: '${type}' is of an unknown type`);
      }
      const [readFn] = this.types.get(type) as Function[];
      retValue.push(readFn(readBytes, this));
    }
    if (array.length !== 0) {
      throw Error('Struct.read() failure: Struct does not match schema');
    }
    return retValue;
  }

  /** Writes data to the Struct */
  public write(type: string, source: unknown): Struct {
    if (!this.types.has(type)) {
      throw TypeError(`Struct.write() failure: '${type}' is of an unknown type`);
    }
    const [, writeFn] = this.types.get(type) as Function[]; // Get our writeFn, defined in .addType(...)
    const result: Uint8Array = writeFn(source); // Actual conversion from 'type' to Uint8Array

    const requiredLength = this.cursorPos + result.length; // How much room we'll need
    if (this.length < requiredLength) {
      // Too big
      if (this.autoExpand) {
        const newStruct = new Struct(requiredLength); // Create new (bigger) Struct
        newStruct.set(this.slice(0, this.cursorPos)); // Copy current buffer accross
        newStruct.cursorPos = this.cursorPos; // Copy our cursor position
        newStruct.schema = this.schema; // ... and copy current Schema
        newStruct.write(type, source); // Let's try write() again
        return newStruct;
      }
      throw Error('Struct.read() failure: Attempting to read beyond struct buffer');
    }

    this.schema.push(type);
    this.set(result, this.cursorPos);
    this.cursorPos += result.length;
    return this;
  }

  /** Convenience method - Calls struct.write(...) */
  public string(string: string): Struct {
    return this.write('string', string);
  }

  /** Convenience method - Calls struct.write(...) */
  public uint8(n: string): Struct {
    return this.write('uint8', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public uint16(n: string): Struct {
    return this.write('uint16', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public uint16LE(n: string): Struct {
    return this.write('uint16LE', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public uint16BE(n: string): Struct {
    return this.write('uint16BE', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public uint32(n: string): Struct {
    return this.write('uint32', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public uint32LE(n: string): Struct {
    return this.write('uint32LE', n);
  }

  /** Convenience method - Calls struct.write(...) */
  public uint32BE(n: string): Struct {
    return this.write('uint32BE', n);
  }

  /** Return the struct schema, which is useful when calling struct.read() */
  public toSchema(): string[] {
    return this.schema;
  }
}
