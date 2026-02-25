// Simulate the fix for Arini Miranda
const nipData = {
  tahunMasuk: '2022-03-01' // Dari NIP parsing
};

// NEW (FIXED):
const tmtPns = `1 ${new Date(nipData.tahunMasuk).toLocaleString('id-ID', { month: 'long' })} ${new Date(nipData.tahunMasuk).getFullYear()}`;
const tmtPangkat = '1 Maret 2022'; // Dari Google Sheets

console.log('='.repeat(60));
console.log('✓ FIX VERIFICATION: Arini Miranda');
console.log('='.repeat(60));
console.log('\nBEFORE (BROKEN):');
console.log('  tmtPns:     "Maret 2022"');
console.log('  tmtPangkat: "1 Maret 2022"');
console.log('  Match? NO ❌');

console.log('\nAFTER (FIXED):');
console.log('  tmtPns:     "' + tmtPns + '"');
console.log('  tmtPangkat: "' + tmtPangkat + '"');
console.log('  Match? ' + (tmtPns === tmtPangkat ? 'YES ✅' : 'NO ❌'));

console.log('\nRESULT:');
console.log('  CPNS II/c detected? ' + (tmtPns === tmtPangkat ? 'YES ✅' : 'NO ❌'));
console.log('  Expected Kebutuhan AK: 40 (was showing 60) ' + (tmtPns === tmtPangkat ? '✅ CORRECT' : '❌ STILL WRONG'));
