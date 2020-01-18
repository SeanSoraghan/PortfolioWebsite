// This script assumes the following global variables:
// function fn_load_content
// int i_num_sections

var i_current_section = 0;
var str_btn_icon_selected = "images/CircleButtonWhiteCentrePadded.png";
var str_btn_icon_unselected = "images/CircleButtonBlockPadded.png";
var str_nav_id_stem = '#nav-b-'

function set_visible(element, b_visible)
{
    if (b_visible)
        element.css('visibility', 'visible');
    else
        element.css('visibility', 'hidden')
}
function set_current_section(i_section)
{
    if (i_current_section != i_section)
    {
        $(str_nav_id_stem + i_current_section).attr("src", str_btn_icon_unselected);
        i_current_section = i_section;
        set_visible($("#nav-b-left"), i_current_section != 0);
        set_visible($("#nav-b-right"), i_current_section != i_num_sections - 1);
        $(str_nav_id_stem + i_current_section).attr("src", str_btn_icon_selected);                
    }
}
var i_anim_duration = 400;
var i_text_anim_duration = 100;
function collapse_div(div_id, fnc_complete)
{
    var inner_text_id = div_id + "-text";
    $(inner_text_id).slideUp(i_text_anim_duration, function()
    {
        $(div_id).slideUp(i_anim_duration, fnc_complete);
    });
}
function expand_div(div_id, fnc_complete)
{
    var inner_text_id = div_id + "-text";
    $(div_id).slideDown(i_anim_duration, function()
    {
        $(inner_text_id).slideDown(i_text_anim_duration, fnc_complete);
    });
}

// assumes global fn variable fn_load_content
function load_section(i_section)
{
    if (i_section >= 0 && i_section < i_num_sections)
    {                
        fn_load_content(i_section)
        set_current_section(i_section);
    }
}
$( "#nav-b-left" ).click(function() {
    load_section(i_current_section - 1);
});
$( "#nav-b-right" ).click(function() {
    load_section(i_current_section + 1);
});

for (let s = 0; s < i_num_sections; ++s)
{
    $(str_nav_id_stem + s).click( function() { load_section(s); } );
}