var term;

var pc = 0;
var regs = new Uint32Array(8);
var free = [];
var mem = [];

var input = "";

function start() {
    loadProgn("umix.um");
    reset();
    run();
}

function loadProgn(file) {
    var bin = loadBinary(file);
    var len = bin.length;
    var m0 = new Uint32Array(len / 4);
    for (var i = 0; i < len / 4; ++i) {
        m0[i] =
            (bin[i * 4 + 0] << 24) |
            (bin[i * 4 + 1] << 16) |
            (bin[i * 4 + 2] <<  8) |
            (bin[i * 4 + 3] <<  0);
    }
    mem[0] = m0;
}

function reset() {
    pc = 0;
    for (var i = 0; i < 8; ++i)
        regs[i] = 0;
}

function run() {
    try{
        for (var i = 0; i < 100000; ++i)
            step();
    }
    catch(e) {
        if (e == "halt")
            return;
        if (e == "input") {
            setTimeout(run, 10);
            return;
        }
    }
    setTimeout(run, 0);
}

function step() {
    var opc = mem[0][pc++];
    var a = (opc >> 6) & 7;
    var b = (opc >> 3) & 7;
    var c = (opc >> 0) & 7;

    switch((opc >> 28) & 15) {
    case 0: // Conditional Move
        if (regs[c] != 0) regs[a] = regs[b];
        break;
    case 1: // Array Index
        regs[a] = mem[regs[b]][regs[c]];
        break;
    case 2: // Array Amendent
        mem[regs[a]][regs[b]] = regs[c];
        break;
    case 3: // Addition
        regs[a] = (regs[b] + regs[c]) & 0xffffffff;
        break;
    case 4: // Multiplication
        regs[a] = (regs[b] * regs[c]) & 0xffffffff;
        break;
    case 5: // Division
        regs[a] = regs[b] / regs[c];
        break;
    case 6: // Not-And
        regs[a] = ~(regs[b] & regs[c]);
        break;

    case 7: // Halt
        throw "halt";
    case 8: // Allocation
        if (free.length > 0) {
            var ix = free.pop();
            mem[ix] = new Uint32Array(regs[c]);
            regs[b] = ix;
        }
        else {
            mem.push(new Uint32Array(regs[c]));
            regs[b] = mem.length - 1;
        }
        break;
    case 9: // Abandoment
        free.push(regs[c]);
        mem[regs[c]] = null;
        break;
    case 10: // Output
        if (String.fromCharCode(regs[c]) == "\n")
            term.write("\r");
        term.write(String.fromCharCode(regs[c]));
        if (String.fromCharCode(regs[c]) == "\n")
            throw "output";
        break;
    case 11: // Input
        if (input.length == 0) {
            pc--;
            throw "input";
        }
        regs[c] = input.charCodeAt(0) & 0xff;
        //alert(regs[c] + ": " + input[0]);
        input = input.substr(1);
        break;
    case 12: // Load Program
        if (regs[b] != 0) {
            alert("long jump");
            mem[0] = mem[regs[b]].clone();
            alert("long jumped");
        }
        pc = regs[c];
        break;

    case 13: // Orthgraphy
        regs[(opc >> 25) & 7] = opc & 0x01ffffff;
        break;
    }
}

function loadBinary(file) {
    var req = new XMLHttpRequest();
    req.open('GET', file, false);

    if ('mozResponseType' in req)
        req.mozResponseType = 'arraybuffer';
    else if('responseType' in req)
        req.responseType = 'arraybuffer';
    else
        req.overrideMimeType('text/plain; charset=x-user-defined');

    req.send(null);

    if (req.status != 200 && req.status != 0)
        throw "Error while loading " + file;

    var resp;
    if('mozResponse' in req)
        resp = req.mozResponse;
    else if(req.mozResponseArrayBuffer)
        resp = req.mozResponseArrayBuffer;
    else if('responseType' in req)
        resp = req.response;
    else
        resp = req.responseText;

    return new Uint8Array(resp, 0, resp.byteLength);
}

//-----

function termOpen() {
    term = new Term(80,30,termHandler);
    term.open();
}

function termHandler(va) {
    if (va == "\r") {
        term.write("\r\n");
        input += "\n";
    }
    else {
        term.write(va);
        input += va;
    }
}

termOpen();
