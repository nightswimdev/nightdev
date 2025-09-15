self.__uv$config = {
    prefix: '/active/go/',
    bare: 'https://epoxy.barndog.pro',
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: '/active/uv/uv.handler.js',
    bundle: '/active/uv/uv.bundle.js',
    config: '/active/uv/uv.config.js',
    sw: '/active/uv/uv.sw.js',
    transport: {
        type: 'epoxy',
        config: {
            path: '/epoxy'
        }
    }
};
