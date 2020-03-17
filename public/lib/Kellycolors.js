class Kellycolors {

    static init() {
        Kellycolors.KELLY_COLORS = [
            { name: 'kellycolor01', color: '#F3C300' },
            { name: 'kellycolor02', color: '#875692' },
            { name: 'kellycolor03', color: '#F38400' },
            { name: 'kellycolor04', color: '#A1CAF1' },
            { name: 'kellycolor05', color: '#BE0032' },
            { name: 'kellycolor06', color: '#C2B280' },
            { name: 'kellycolor07', color: '#848482' },
            { name: 'kellycolor08', color: '#008856' },
            { name: 'kellycolor09', color: '#E68FAC' },
            { name: 'kellycolor10', color: '#0067A5' },
            { name: 'kellycolor11', color: '#F99379' },
            { name: 'kellycolor12', color: '#604E97' },
            { name: 'kellycolor13', color: '#F6A600' },
            { name: 'kellycolor14', color: '#B3446C' },
            { name: 'kellycolor15', color: '#DCD300' },
            { name: 'kellycolor16', color: '#882D17' },
            { name: 'kellycolor17', color: '#8DB600' },
            { name: 'kellycolor18', color: '#654522' },
            { name: 'kellycolor19', color: '#E25822' },
            { name: 'kellycolor20', color: '#2B3D26' },
        ];
    }

    static getNextColor() {
        var retval = Kellycolors.KELLY_COLORS.shift();
        Kellycolors.KELLY_COLORS.push(retval);
        return(retval);
    }

    static getColors(n) {
        return(Kellycolors.KELLY_COLORS.slice(-n));
    }

}
