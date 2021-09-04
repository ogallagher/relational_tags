# Owen Gallagher
# 2021-09-03
# template filters (methods accessible from html templates)

from django import template

register = template.Library()

import relational_tags as rt

def rt_conn_type_to_str(conn_type) -> str:
    """Convert RelationalTagConnection type to string.
    """
    
    return rt.RelationalTagConnection.type_to_str(conn_type)
# end rt_conn_type_to_str

register.filter('rt_conn_type_to_str', rt_conn_type_to_str)
