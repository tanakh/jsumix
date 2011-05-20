#include <iostream>
#include <iomanip>
#include <fstream>
#include <sstream>
#include <vector>
#include <stack>
#include <cassert>
#include <tr1/unordered_map>
#include <stdint.h>
using namespace std;
using namespace std::tr1;

class um {
public:
  um(const uint8_t *progn, size_t n) {
    assert(n % 4 == 0);

    n /= 4;
    vector<uint32_t> progn_array(n);
    for (size_t i = 0; i < n; ++i) {
      progn_array[i] =
        ((uint32_t)progn[i * 4 + 0] << 24u) |
        ((uint32_t)progn[i * 4 + 1] << 16u) |
        ((uint32_t)progn[i * 4 + 2] <<  8u) |
        ((uint32_t)progn[i * 4 + 3] <<  0u);
    }

    mem_.push_back(progn_array);

    init();
  }
  ~um() {}

  void run() {
    while(step());
  }

private:
  void init() {
    pc_ = 0;
    for (int i = 0; i < 8; ++i) regs_[i] = 0;
  }

  bool step() {
    uint32_t opc = mem_[0][pc_++];
    uint32_t a = (opc >> 6) & 7;
    uint32_t b = (opc >> 3) & 7;
    uint32_t c = (opc >> 0) & 7;

    /*
    cout<<hex<<setw(8)<<setfill('0')<<pc_<<": "
        <<setw(2)<<dec<<(opc>>28)
        <<" "<<a
        <<" "<<b
        <<" "<<c
        <<endl;
    */

    switch(opc >> 28) {
    case 0: // Conditional Move
      if (regs_[c] != 0) regs_[a] = regs_[b];
      return true;
    case 1: // Array Index
      regs_[a] = mem_[regs_[b]][regs_[c]];
      return true;
    case 2: // Array Amendment
      mem_[regs_[a]][regs_[b]] = regs_[c];
      return true;
    case 3: // Addition
      regs_[a] = regs_[b] + regs_[c];
      return true;
    case 4: // Multiplication
      regs_[a] = regs_[b] * regs_[c];
      return true;
    case 5: // Division
      regs_[a] = regs_[b] / regs_[c];
      return true;
    case 6: // Not-And
      regs_[a] = ~(regs_[b] & regs_[c]);
      return true;

    case 7: // Halt
      return false;
    case 8: // Allocation
      if (free_.size()) {
        size_t size = regs_[c];
        regs_[b] = free_.top();
        free_.pop();
        mem_[regs_[b]].resize(size);
        for (size_t i = 0; i < size; i++)
          mem_[regs_[b]][i] = 0;
      }
      else {
        mem_.push_back(vector<uint32_t>(regs_[c], 0));
        regs_[b] = mem_.size() - 1;
      }
      return true;
    case 9: // Abandonment
      free_.push(regs_[c]);
      return true;
    case 10: // Output
      cout << (char)(regs_[c]);
      return true;
    case 11: // Input
      {
        char in;
        if (!cin.get(in))
          regs_[c] = 0xffffffffu;
        else
          regs_[c] = (uint8_t)in;
        return true;
      }
    case 12: // Load Program
      if (regs_[b] != 0)
        mem_[0] = mem_[regs_[b]];
      pc_ = regs_[c];
      return true;

    case 13: // Orthography
      regs_[(opc >> 25) & 7] = opc & 0x01ffffffu;
      return true;
    }

    cerr << "Invalid Opecode: "
         << hex << setw(8) << setfill('0') << opc << dec
         << endl;

    return false;
  }

  uint32_t pc_;
  uint32_t regs_[8];
  stack<uint32_t> free_;
  vector<vector<uint32_t> > mem_;
};

int main(int argc, char *argv[])
{
  ifstream ifs(argv[1]);

  stringstream ss;
  ss << ifs.rdbuf();

  string progn = ss.str();

  um m((const uint8_t*)&progn[0], progn.size());
  m.run();

  return 0;
}
