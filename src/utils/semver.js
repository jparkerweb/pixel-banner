// ------------------ //
// -- semver utils -- //
// ------------------ //
export const semver = {
    parse: (versionString) => {
        const [major, minor, patch] = versionString.split('.').map(Number);
        return { major, minor, patch };
    },
    
    gt: (v1, v2) => {
        const ver1 = semver.parse(v1);
        const ver2 = semver.parse(v2);
        
        if (ver1.major > ver2.major) return true;
        if (ver1.major < ver2.major) return false;
        
        if (ver1.minor > ver2.minor) return true;
        if (ver1.minor < ver2.minor) return false;
        
        return ver1.patch > ver2.patch;
    }
};