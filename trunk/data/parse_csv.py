#!/usr/bin/env python

import sys
import csv
import re
import json

# Field names & offsets for CSV file
Fields = { 'band'         : 0, 
           'allocation'   : 1, 
           'availability' : 2, 
           'licensee'     : 3, 
           'assignment'   : 4, 
           'bandwidth'    : 5, 
           'application'  : 6, 
           'comment'      : 7 }

Units = { 'Hz'  : 1.0,
          'KHz' : 1000.0,
          'kHz' : 1000.0,
          'MHz' : 1000000.0,
          'GHz' : 1000000000.0,
          'THz' : 1000000000000.0 }



# parse a frequency band of the form:
#   n.n [?Hz] - n.n ?Hz [//] band
parser_frange = re.compile(r'([0-9,.]+)\D*([0-9,.]+)\s*(.Hz)?\D*([0-9,.]+)?\D*([0-9,.]+)?\s*(.Hz)?')
def parse_band(band):
  ret = None
  frange = None
  try:
    frange = parser_frange.search(band).groups()
  except:
    raise Exception("Range Parse error: '" + band + "'")
  if   frange[2] != None:                      unit = frange[2]
  elif frange[2] == None and frange[5] != None: unit = frange[5]
  else: raise Exception("No unit specified in: " + band)
  if frange[0] != None and frange[1] != None and frange[3] != None and frange[4] != None: # tdd
    ret = { 'begin'    : min(float(frange[0]), float(frange[3])) * Units[unit],
            'end'      : max(float(frange[1]), float(frange[4])) * Units[unit],
            'uplink'   : { 'begin' : float(frange[0]) * Units[unit],
                           'end'   : float(frange[1]) * Units[unit] },
            'downlink' : { 'begin' : float(frange[3]) * Units[unit],
                           'end'   : float(frange[4]) * Units[unit] } }
    bandwidth = (ret['uplink']['end'] - ret['uplink']['begin']) + (ret['downlink']['end'] - ret['downlink']['begin'])
  elif frange[0] != None and frange[1] != None:
    ret = { 'begin' : float(frange[0]) * Units[unit],
            'end'   : float(frange[1]) * Units[unit] }
    bandwidth = ret['end'] - ret['begin']
  else: raise Exception("Invalid band specification: " + band)
  ret['bandwidth'] = bandwidth
  return ret
# tests
parse_band('10.50 GHz - 10.650 GHz')
parse_band('10.50-10.650GHz')
parse_band('10.50 -10.650 GHz')
parse_band('10.50 - 10.650 GHz')
parse_band('10.150 - 10.300 GHz // 10.50 - 10.650 GHz')
parse_band('10.150 GHz - 10.300 GHz // 10.50 GHz - 10.650 GHz')
parse_band('10.150 - 10.300 // 10.50 - 10.650 GHz')

# parse assignment bandwidth of the form:
#  [nx] n.n [?Hz] [FDD/TDD]
parser_bandwidth = re.compile(r'(([0-9]+)\s?[x,X]\s?)?([0-9,.]+)\s*(.Hz)?')
def parse_bandwidth(bandwidth):
  ret = None

  try:
    frange = parser_bandwidth.search(bandwidth).groups()
  except:
    raise Exception("Bandwidth parse error: '" + bandwidth + "'")
  if frange[1] != None and frange[2] != None and frange[3] != None:
    ret = float(frange[1]) * float(frange[2]) * Units[frange[3]]
  elif frange[2] != None and frange[3] != None:
    ret = float(frange[2]) * Units[frange[3]]
  else: 
    raise Exception('Invalid bandwidth specification: ' + bandwidth)
  #print ret
  return ret
# tests
parse_bandwidth('12X 40 MHz FDD')
parse_bandwidth('2 x 2.5 MHz simplex')
parse_bandwidth('2x11 MHz FDD')
parse_bandwidth('28x 2.2 MHz FDD')
parse_bandwidth('11 MHz')
parse_bandwidth('2x11.3 MHz FDD')
parse_bandwidth('11.5 MHz')

#sys.exit(0)

# If a field in a row is blank, assume that it has the same value as in the previous row
def check(key, record, latch):
  value = record[Fields[key]]
  if value == '' and key in latch:
    return latch[key]
  elif value != '':
    latch[key] = value
  return value


# Convert each row in CSV file to JSON
def main():
  
  if len(sys.argv) != 2:
    print "Usage: parse_csv.py <filename.csv>"
    print
    sys.exit(2)

  table = csv.reader(open(sys.argv[1]), delimiter=',', quotechar='\"')
  allocations = []
  assignments = []
  assignments_bandwidth = 0
  latch = {}

  # loop through every entry in the CSV file
  for record in table:
    if len(record) < 3:
      continue
    elif len(record) != 8: # stupid google export loses last field if empty
      for n in range(len(record), 8): 
        record.append("")

    # add allocation
    if record[Fields['band']] == 'Frequency Band' and 'band' in latch:
      try:
        frange = parse_band(latch['allocation'])
      except Exception as e:
        print "Could not parse: " + str(latch)
        continue
      #print "STORING BAND: " + latch['band']
      allocations.append({ 'name'         : latch['band'],
                           'frequency'    : frange,
                           'availability' : { 'description' : latch['availability'],
                                              'bandwidth'   : assignments_bandwidth    },
                           'assignments'  : assignments })
      assignments = []
      assignments_bandwidth = 0
      continue
    elif record[Fields['band']] == 'Frequency Band': # first one
      continue

    # parse assignment entry
    try:
      allocation_frequency = parse_band(check('allocation', record, latch))
      #if record[Fields['assignment']] != '':
      try:    assignment_frequency = parse_band(record[Fields['assignment']])
      except: assignment_frequency = None # allocation_frequency
      #print "RECORD: " + record[Fields['band']]
      try:    
        assigned = parse_bandwidth(record[Fields['bandwidth']])
        assignments_bandwidth += assigned
      except: assigned = '?'
      check('band', record, latch)
      check('availability', record, latch)
      assignments.append({ #'band'         : check('band', record, latch), 
                           #'allocation'   : allocation_frequency,
                           'availability' : { #'description' : check('availability', record, latch),
                                              'channels'    : record[Fields['bandwidth']],
                                              'bandwidth'   : assigned },
                           'licensee'     : check('licensee', record, latch),
                           'frequency'    : assignment_frequency,
                           'application'  : check('application', record, latch),
                           'comment'      : record[Fields['comment']] })
      #print
      #print check('licensee', record, latch)
      #print "Allocation Frequency: " + str(allocation_frequency)
      #print "Frequency: " + check('allocation', record, latch) + "\t" + str(assignment_frequency)
    except Exception as e:
      print "Exception: " + str(e)
      continue

  # dump data to stdout
  #print json.dumps(allocations)
  print json.dumps(allocations, sort_keys=True, indent=4)

main()


"""

JSON Format:

  [ { name         : "",
      availability : { bandwidth   : 0, 
                       description : "" },
      frequency    : { bandwidth : 0,
                       begin     : 0,
                       end       : 0,
                       uplink    : { begin : 0, end : 0 },
                       downlink  : { begin : 0, end : 0 } },
      assignments : [ { application  : "", 
                        availability : { bandwidth : 0,
                                         channels  : "" },
                        comment      : "",
                        frequency    : { bandwidth : 0,
                                         begin     : 0,
                                         end       : 0,
                                         uplink    : { begin : 0, end : 0 },
                                         downlink  : { begin : 0, end : 0 } },
                        licensee     : "" 
                      }, ... ]
    }, ...  ]

"""
