import BN from "bignumber.js";
import bs58check from "bs58check"

const utility = {
    totez: m => parseInt(m) / 1000000,
    mutez: function(tz) {
      return new BN(new BN(tz).toFixed(6)).multipliedBy(1000000).toString();
    },
    b58cencode: function(payload, prefix) {
      const n = new Uint8Array(prefix.length + payload.length);
      n.set(prefix);
      n.set(payload, prefix.length);
      return bs58check.encode(new Buffer(n, "hex"));
    },
    b58cdecode: function(enc, prefix) {
      return bs58check.decode(enc).slice(prefix.length);
    },
    buf2hex: function(buffer) {
      const byteArray = new Uint8Array(buffer),
        hexParts = [];
      for (let i = 0; i < byteArray.length; i++) {
        let hex = byteArray[i].toString(16);
        let paddedHex = ("00" + hex).slice(-2);
        hexParts.push(paddedHex);
      }
      return hexParts.join("");
    },
    hex2buf: function(hex) {
      return new Uint8Array(
        hex.match(/[\da-f]{2}/gi).map(function(h) {
          return parseInt(h, 16);
        })
      );
    },
    hexNonce: function(length) {
      var chars = "0123456789abcedf";
      var hex = "";
      while (length--) hex += chars[(Math.random() * 16) | 0];
      return hex;
    },
    mergebuf: function(b1, b2) {
      var r = new Uint8Array(b1.length + b2.length);
      r.set(b1);
      r.set(b2, b1.length);
      return r;
    },
    sexp2mic: function me(mi) {
      mi = mi
        .replace(/(?:@[a-z_]+)|(?:#.*$)/gm, "")
        .replace(/\s+/g, " ")
        .trim();
      if (mi.charAt(0) === "(") mi = mi.slice(1, -1);
      let pl = 0;
      let sopen = false;
      let escaped = false;
      let ret = {
        prim: "",
        args: []
      };
      let val = "";
      for (let i = 0; i < mi.length; i++) {
        if (escaped) {
          val += mi[i];
          escaped = false;
          continue;
        } else if (
          (i === mi.length - 1 && sopen === false) ||
          (mi[i] === " " && pl === 0 && sopen === false)
        ) {
          if (i === mi.length - 1) val += mi[i];
          if (val) {
            if (val === parseInt(val).toString()) {
              if (!ret.prim) return { int: val };
              else ret.args.push({ int: val });
            } else if (val[0] == "0") {
              if (!ret.prim) return { bytes: val };
              else ret.args.push({ bytes: val });
            } else if (ret.prim) {
              ret.args.push(me(val));
            } else {
              ret.prim = val;
            }
            val = "";
          }
          continue;
        } else if (mi[i] === '"' && sopen) {
          sopen = false;
          if (!ret.prim) return { string: val };
          else ret.args.push({ string: val });
          val = "";
          continue;
        } else if (mi[i] === '"' && !sopen && pl === 0) {
          sopen = true;
          continue;
        } else if (mi[i] === "\\") escaped = true;
        else if (mi[i] === "(") pl++;
        else if (mi[i] === ")") pl--;
        val += mi[i];
      }
      return ret;
    },
    mic2arr: function me2(s) {
      let ret = [];
      if (s.hasOwnProperty("prim")) {
        if (s.prim === "Pair") {
          ret.push(me2(s.args[0]));
          ret = ret.concat(me2(s.args[1]));
        } else if (s.prim === "Elt") {
          ret = {
            key: me2(s.args[0]),
            val: me2(s.args[1])
          };
        } else if (s.prim === "True") {
          ret = true;
        } else if (s.prim === "False") {
          ret = false;
        }
      } else {
        if (Array.isArray(s)) {
          let sc = s.length;
          for (let i = 0; i < sc; i++) {
            let n = me2(s[i]);
            if (typeof n.key !== "undefined") {
              if (Array.isArray(ret)) {
                ret = {
                  keys: [],
                  vals: []
                };
              }
              ret.keys.push(n.key);
              ret.vals.push(n.val);
            } else {
              ret.push(n);
            }
          }
        } else if (s.hasOwnProperty("string")) {
          ret = s.string;
        } else if (s.hasOwnProperty("int")) {
          ret = parseInt(s.int);
        } else {
          ret = s;
        }
      }
      return ret;
    },
    ml2mic: function me(mi) {
      let ret = [],
        inseq = false,
        seq = "",
        val = "",
        pl = 0,
        bl = 0,
        sopen = false,
        escaped = false;
      for (let i = 0; i < mi.length; i++) {
        if (val === "}" || val === ";") {
          val = "";
        }
        if (inseq) {
          if (mi[i] === "}") {
            bl--;
          } else if (mi[i] === "{") {
            bl++;
          }
          if (bl === 0) {
            let st = me(val);
            ret.push({
              prim: seq.trim(),
              args: [st]
            });
            val = "";
            bl = 0;
            inseq = false;
          }
        } else if (mi[i] === "{") {
          bl++;
          seq = val;
          val = "";
          inseq = true;
          continue;
        } else if (escaped) {
          val += mi[i];
          escaped = false;
          continue;
        } else if (
          (i === mi.length - 1 && sopen === false) ||
          (mi[i] === ";" && pl === 0 && sopen == false)
        ) {
          if (i === mi.length - 1) val += mi[i];
          if (val.trim() === "" || val.trim() === "}" || val.trim() === ";") {
            val = "";
            continue;
          }
          ret.push(this.ml2tzjson(val));
          val = "";
          continue;
        } else if (mi[i] === '"' && sopen) sopen = false;
        else if (mi[i] === '"' && !sopen) sopen = true;
        else if (mi[i] === "\\") escaped = true;
        else if (mi[i] === "(") pl++;
        else if (mi[i] === ")") pl--;
        val += mi[i];
      }
      return ret;
    },
    formatMoney: function(n, c, d, t) {
      var c = isNaN((c = Math.abs(c))) ? 2 : c,
        d = d === undefined ? "." : d,
        t = t === undefined ? "," : t,
        s = n < 0 ? "-" : "",
        i = String(parseInt((n = Math.abs(Number(n) || 0).toFixed(c)))),
        j = (j = i.length) > 3 ? j % 3 : 0;
      return (
        s +
        (j ? i.substr(0, j) + t : "") +
        i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) +
        (c
          ? d +
            Math.abs(n - i)
              .toFixed(c)
              .slice(2)
          : "")
      );
    }
}

module.exports = utility;